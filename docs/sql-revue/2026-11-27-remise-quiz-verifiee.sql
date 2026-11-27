-- CANDIDAT NON APPLIQUÉ (27/11/2026) — remise de quiz vérifiée par le serveur avant validation de module.
-- Pourquoi : submit_quiz_attempt (SECURITY DEFINER) et la politique d'insertion élève enregistrent
-- reponses/score/total tels qu'envoyés par le navigateur ; 0308 accepte toute ligne status='submitted'.
-- Une remise vide ou partielle pouvait donc ouvrir le contrôle par quiz.
-- Ce candidat :
--  1) fige (append-only) l'empreinte md5 des remises d'origine EXISTANTES non vides : elles restent
--     acceptées tant que leurs réponses sont inchangées (Bilans projetés compris) ;
--  2) quiz_remise_verifiee : une remise postérieure n'est acceptée que si elle couvre, sans réponse vide,
--     toutes les questions actives non supprimées du contenu serveur (module_editor_state) ;
--  3) save_module_completion refuse sinon, en nommant les quiz (non remis / non vérifiables).
-- Limite assumée : les quiz dont l'affichage ne correspond pas au contenu serveur (Bilans projetés
-- 4/9/27/29, certains quiz complétés par du code) ne peuvent plus être validés seuls après application :
-- la route reste la validation Admin journalisée (admin_valider_module_preuve_legacy / écriture Admin).
-- Aucune réponse, tentative, note, score ou relevé existant n'est modifié.

CREATE TABLE IF NOT EXISTS public.quiz_remises_anterieures_figees (
  apprenant_id uuid NOT NULL,
  exercice_id text NOT NULL,
  empreinte_reponses text NOT NULL,
  submitted_at timestamptz NOT NULL,
  fige_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (apprenant_id, exercice_id)
);
REVOKE ALL ON public.quiz_remises_anterieures_figees FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quiz_remises_anterieures_figees TO service_role;
ALTER TABLE public.quiz_remises_anterieures_figees ENABLE ROW LEVEL SECURITY;

INSERT INTO public.quiz_remises_anterieures_figees (apprenant_id, exercice_id, empreinte_reponses, submitted_at)
SELECT r.apprenant_id, r.exercice_id, md5(r.reponses::text), r.submitted_at
  FROM public.reponses_apprenants r
 WHERE r.exercice_id ~ '^module_\d+_exo_\d+$'
   AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
   AND public.reponse_enregistree(r.reponses)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.quiz_remises_figees_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Registre des remises antérieures figé : ajout seul' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER trg_quiz_remises_figees_append_only
  BEFORE UPDATE OR DELETE ON public.quiz_remises_anterieures_figees
  FOR EACH ROW EXECUTE FUNCTION public.quiz_remises_figees_append_only();

-- États : non_remise | verifiee | anterieure_figee | incomplete | non_verifiable
CREATE OR REPLACE FUNCTION public.quiz_remise_verifiee(_apprenant_id uuid, _module_id integer, _exercice text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_nb integer;
  v_ok integer;
BEGIN
  SELECT x.reponses, x.submitted_at INTO r
    FROM public.reponses_apprenants x
   WHERE x.apprenant_id = _apprenant_id
     AND x.exercice_id = 'module_' || _module_id || '_exo_' || _exercice
     AND x.status = 'submitted' AND x.submitted_at IS NOT NULL;
  IF NOT FOUND THEN RETURN 'non_remise'; END IF;
  SELECT count(*), count(*) FILTER (WHERE jsonb_typeof(r.reponses) = 'object'
                                      AND public.reponse_enregistree(r.reponses -> (_exercice || '-' || (q->>'id'))))
    INTO v_nb, v_ok
    FROM public.module_editor_state m,
         jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) t(e),
         jsonb_array_elements(CASE WHEN jsonb_typeof(t.e->'questions') = 'array' THEN t.e->'questions' ELSE '[]'::jsonb END) q
   WHERE m.module_id = _module_id AND t.e->>'id' = _exercice
     AND COALESCE(t.e->>'actif', 'true') <> 'false'
     AND COALESCE(q->>'actif', 'true') <> 'false'
     AND q->>'id' IS NOT NULL
     AND NOT COALESCE(jsonb_typeof(t.e->'deletedQuestionIds') = 'array'
                      AND t.e->'deletedQuestionIds' @> jsonb_build_array(q->'id'), false);
  IF v_nb > 0 AND v_ok = v_nb THEN RETURN 'verifiee'; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_remises_anterieures_figees f
              WHERE f.apprenant_id = _apprenant_id
                AND f.exercice_id = 'module_' || _module_id || '_exo_' || _exercice
                AND f.empreinte_reponses = md5(r.reponses::text)
                AND f.submitted_at = r.submitted_at) THEN
    RETURN 'anterieure_figee';
  END IF;
  RETURN CASE WHEN v_nb = 0 THEN 'non_verifiable' ELSE 'incomplete' END;
END $$;
REVOKE EXECUTE ON FUNCTION public.quiz_remise_verifiee(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_remise_verifiee(uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.save_module_completion(_apprenant_id uuid, _module_id integer, _completed boolean DEFAULT false, _progress integer DEFAULT 0, _score_obtenu integer DEFAULT NULL::integer, _score_max integer DEFAULT NULL::integer, _details jsonb DEFAULT NULL::jsonb)
 RETURNS apprenant_module_completion
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed BOOLEAN;
  result public.apprenant_module_completion;
  v_deja_termine boolean;
  v_nb_questions bigint := 0;
  v_preuve boolean;
  v_manquantes integer := 0;
  v_quiz_non_remis text;
  v_quiz_non_verifie text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role'
  INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'not authorized for this apprenant'; END IF;
  IF _completed THEN
    SELECT EXISTS (SELECT 1 FROM public.apprenant_module_completion
                    WHERE apprenant_id = _apprenant_id AND module_id = _module_id AND status = 'completed')
      INTO v_deja_termine;
    IF NOT v_deja_termine THEN
      IF _module_id=8 AND NOT public.quiz_lyon_reponses_completes(_apprenant_id) THEN
        RAISE EXCEPTION 'QUIZ_LYON_INCOMPLET: 138 réponses exigées' USING ERRCODE='P0501';
      END IF;
      -- Candidat 27/11 : chaque quiz actif exige une remise VÉRIFIÉE par le serveur (quiz_remise_verifiee) :
      -- couverture complète et non vide des questions actives du contenu serveur, ou remise antérieure figée
      -- dont l'empreinte est inchangée. Score, total et nombre envoyés par le navigateur ne sont jamais lus.
      IF _module_id NOT IN (5, 11) AND _module_id NOT BETWEEN 35 AND 38
         AND NOT EXISTS (SELECT 1 FROM public.module_regles_validation r WHERE r.module_id = _module_id
                          AND r.contient_questions IS TRUE AND r.protection_serveur IS FALSE) THEN
        SELECT string_agg(format('« %s »', z.titre), ', ' ORDER BY z.o) FILTER (WHERE z.etat = 'non_remise'),
               string_agg(format('« %s »', z.titre), ', ' ORDER BY z.o) FILTER (WHERE z.etat NOT IN ('non_remise', 'verifiee', 'anterieure_figee'))
          INTO v_quiz_non_remis, v_quiz_non_verifie
          FROM (
            SELECT COALESCE(NULLIF(btrim(t.e->>'titre'), ''), 'quiz n° ' || (t.e->>'id')) AS titre, t.o,
                   public.quiz_remise_verifiee(_apprenant_id, _module_id, t.e->>'id') AS etat
              FROM public.module_editor_state m,
                   jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) WITH ORDINALITY AS t(e, o)
             WHERE m.module_id = _module_id
               AND (t.e->>'id') ~ '^\d+$'
               AND COALESCE(t.e->>'actif', 'true') <> 'false'
               AND jsonb_typeof(t.e->'questions') = 'array'
               AND EXISTS (SELECT 1 FROM jsonb_array_elements(t.e->'questions') q
                            WHERE COALESCE(q->>'actif', 'true') <> 'false'
                              AND NOT COALESCE(jsonb_typeof(t.e->'deletedQuestionIds') = 'array'
                                               AND t.e->'deletedQuestionIds' @> jsonb_build_array(q->'id'), false))
          ) z;
        IF v_quiz_non_remis IS NOT NULL OR v_quiz_non_verifie IS NOT NULL THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: %', concat_ws(' ; ',
              'quiz non remis au serveur : ' || v_quiz_non_remis,
              'remise incomplète ou non vérifiable par le serveur (validation Admin journalisée requise si la remise est authentique) : ' || v_quiz_non_verifie)
            USING ERRCODE = 'P0501';
        END IF;
      END IF;
      SELECT COALESCE(SUM(CASE WHEN jsonb_typeof(e->'questions') = 'array' THEN jsonb_array_length(e->'questions') ELSE 0 END), 0)
        INTO v_nb_questions
        FROM public.module_editor_state m,
             jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e
       WHERE m.module_id = _module_id;
      IF v_nb_questions = 0 AND EXISTS (SELECT 1 FROM public.module_regles_validation r
                                         WHERE r.module_id = _module_id AND r.protection_serveur AND r.contient_questions IS TRUE) THEN
        v_nb_questions := 1;
      END IF;
      IF v_nb_questions > 0 THEN
        v_preuve := EXISTS (
            SELECT 1 FROM public.reponses_apprenants r, jsonb_each(r.reponses) x
             WHERE r.apprenant_id = _apprenant_id
               AND r.exercice_id LIKE 'module\_' || _module_id || '\_%'
               AND x.value::text NOT IN ('null', '""', '[]', '{}'))
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_details) = 'array' THEN _details ELSE '[]'::jsonb END) d
             WHERE d->'reponseEleve' IS NOT NULL
               AND (d->'reponseEleve')::text NOT IN ('null', '""', '[]', '{}'));
        IF NOT v_preuve THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: aucune réponse enregistrée pour ce module' USING ERRCODE = 'P0501';
        END IF;
      END IF;
      IF jsonb_typeof(_details) = 'array'
         AND _module_id NOT BETWEEN 35 AND 38
         AND NOT EXISTS (SELECT 1 FROM public.module_regles_validation r WHERE r.module_id = _module_id
                          AND r.contient_questions IS TRUE AND r.protection_serveur IS FALSE) THEN
        SELECT count(*) INTO v_manquantes
          FROM jsonb_array_elements(_details) d
         WHERE jsonb_typeof(d) = 'object' AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
           AND NOT (jsonb_typeof(d->'reponseCorrecte') = 'array' AND jsonb_array_length(d->'reponseCorrecte') = 0)
           AND NOT public.reponse_enregistree(d->'reponseEleve')
           AND NOT EXISTS (
             SELECT 1 FROM public.reponses_apprenants r
              WHERE r.apprenant_id = _apprenant_id
                AND r.exercice_id = 'module_' || _module_id || '_exo_' || (d->>'exerciceId')
                AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
                AND jsonb_typeof(r.reponses) = 'object'
                AND NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements(_details) d2
                   WHERE jsonb_typeof(d2) = 'object' AND d2->>'exerciceId' = d->>'exerciceId' AND d2->>'questionId' IS NOT NULL
                     AND NOT (jsonb_typeof(d2->'reponseCorrecte') = 'array' AND jsonb_array_length(d2->'reponseCorrecte') = 0)
                     AND NOT public.reponse_enregistree(r.reponses -> ((d2->>'exerciceId') || '-' || (d2->>'questionId')))));
        IF v_manquantes > 0 THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: % question(s) QCM sans réponse enregistrée', v_manquantes USING ERRCODE = 'P0501';
        END IF;
      END IF;
    END IF;
  END IF;
  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, score_obtenu, score_max, details)
  VALUES (_apprenant_id, _module_id,
    CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN _completed THEN 100 ELSE GREATEST(COALESCE(_progress, 0), 0) END,
    CASE WHEN _completed THEN now() ELSE NULL END,
    _score_obtenu, _score_max, COALESCE(_details, '[]'::jsonb))
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET status = CASE WHEN amc.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
      progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0), CASE WHEN _completed THEN 100 ELSE 0 END),
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at WHEN _completed THEN now() ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE WHEN _details IS NULL THEN amc.details
                     WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                     WHEN amc.status IS DISTINCT FROM 'completed' AND NOT _completed THEN public.fusion_details_progression(amc.details, _details)
                     ELSE _details END
  RETURNING * INTO result;
  RETURN result;
END;
$function$;