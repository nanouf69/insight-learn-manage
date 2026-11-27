-- 0308 — Aucune validation de module à partir d'un nombre ou d'une liste fournis par le navigateur.
-- 1) Écriture directe du relevé (API, rôle authenticated/anon) refusée hors Admin : seules les fonctions
--    serveur (save_module_completion, pages, examens blancs, Bilan futur, validation Admin) écrivent.
-- 2) save_module_completion : à la PREMIÈRE validation, chaque quiz actif du contenu serveur doit avoir
--    une tentative d'origine remise par ce compte (quiz facultatifs, EB 35–38, Bilans examen 5/11 exclus).
-- 3) autovalidate_module_if_complete (total fourni par le navigateur) : réservé au service serveur.
-- Aucune réponse, tentative, note, relevé ou validation existante n'est modifié.

CREATE OR REPLACE FUNCTION public.garde_ecriture_directe_releve_module()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Écriture directe du relevé de module refusée : validation serveur obligatoire' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_000_garde_ecriture_directe_releve
  BEFORE INSERT OR UPDATE ON public.apprenant_module_completion
  FOR EACH ROW EXECUTE FUNCTION public.garde_ecriture_directe_releve_module();

REVOKE EXECUTE ON FUNCTION public.autovalidate_module_if_complete(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete(uuid, integer, integer) TO service_role;

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
      -- 0308 : périmètre exigé = quiz actifs du contenu serveur (jamais la liste envoyée par le navigateur) ;
      -- chaque quiz actif avec des questions doit avoir une tentative d'origine remise par CE compte.
      IF _module_id NOT IN (5, 11) AND _module_id NOT BETWEEN 35 AND 38
         AND NOT EXISTS (SELECT 1 FROM public.module_regles_validation r WHERE r.module_id = _module_id
                          AND r.contient_questions IS TRUE AND r.protection_serveur IS FALSE) THEN
        SELECT string_agg(format('« %s »', COALESCE(NULLIF(btrim(t.e->>'titre'), ''), 'quiz n° ' || (t.e->>'id'))), ', ' ORDER BY t.o)
          INTO v_quiz_non_remis
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
           AND NOT EXISTS (SELECT 1 FROM public.reponses_apprenants r
                            WHERE r.apprenant_id = _apprenant_id
                              AND r.exercice_id = 'module_' || _module_id || '_exo_' || (t.e->>'id')
                              AND r.status = 'submitted' AND r.submitted_at IS NOT NULL);
        IF v_quiz_non_remis IS NOT NULL THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: quiz non remis au serveur : %', v_quiz_non_remis USING ERRCODE = 'P0501';
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