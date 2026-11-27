-- CANDIDAT NON APPLIQUÉ (27/11/2026) — instantané serveur des questions à l'ouverture d'un quiz.
-- À appliquer seulement après décision : la dérivation serveur (module_editor_state) n'est pas
-- identique à l'affichage pour les Bilans projetés (modules 4, 9, 27, 29, 81, 82) ni pour certains
-- quiz complétés par du contenu défini dans le code. L'obligation ne s'applique donc qu'aux
-- exercices inscrits ET activés dans quiz_instantane_exercices (vide = aucun changement de comportement).
-- Contrat : python3 src/test/quiz_instantane_ouverture_sql_contract.py (PostgreSQL jetable).
-- Aucune réponse, tentative, note ni relevé existant n'est modifié.

CREATE TABLE public.quiz_instantane_exercices (
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  actif boolean NOT NULL DEFAULT false,
  motif text NOT NULL,
  active_le timestamptz NOT NULL DEFAULT now(),
  auteur_uid uuid,
  PRIMARY KEY (module_id, exercice_id)
);
GRANT SELECT ON public.quiz_instantane_exercices TO authenticated;
GRANT ALL ON public.quiz_instantane_exercices TO service_role;
ALTER TABLE public.quiz_instantane_exercices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les quiz à instantané" ON public.quiz_instantane_exercices
  FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()), 'admin')));

CREATE TABLE public.quiz_instantanes_ouverture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  exercice_id text NOT NULL,
  module_id integer NOT NULL,
  revision timestamptz,
  source_fingerprint text,
  question_ids text[] NOT NULL,
  question_versions text[] NOT NULL,
  empreinte text NOT NULL,
  auteur_uid uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT quiz_instantanes_ouverture_unique UNIQUE (apprenant_id, exercice_id),
  CONSTRAINT quiz_instantanes_ouverture_longueurs CHECK (cardinality(question_ids) = cardinality(question_versions) AND cardinality(question_ids) > 0)
);
GRANT SELECT ON public.quiz_instantanes_ouverture TO authenticated;
GRANT ALL ON public.quiz_instantanes_ouverture TO service_role;
ALTER TABLE public.quiz_instantanes_ouverture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins et apprenant concerné lisent les instantanés" ON public.quiz_instantanes_ouverture
  FOR SELECT TO authenticated
  USING ((select public.has_role((select auth.uid()), 'admin')) OR public.est_proprietaire_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.quiz_instantanes_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'quiz_instantanes_ouverture est en ajout seul' USING ERRCODE = 'P0579';
END $$;
CREATE TRIGGER trg_quiz_instantanes_append_only BEFORE UPDATE OR DELETE ON public.quiz_instantanes_ouverture
  FOR EACH ROW EXECUTE FUNCTION public.quiz_instantanes_append_only();

-- Ouverture : le serveur dérive lui-même la liste depuis module_editor_state (rien n'est reçu du navigateur).
CREATE OR REPLACE FUNCTION public.ouvrir_quiz_instantane(_apprenant_id uuid, _exercice_id text)
RETURNS TABLE(question_ids text[], empreinte text, revision timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_m int; v_ex int; v_data jsonb; v_rev timestamptz; v_fp text; v_exo jsonb;
        v_ids text[]; v_vers text[]; v_row public.quiz_instantanes_ouverture;
BEGIN
  IF NOT public.est_proprietaire_apprenant(_apprenant_id) THEN
    RAISE EXCEPTION 'Accès au dossier non autorisé' USING ERRCODE = '42501';
  END IF;
  IF _exercice_id IS NULL OR _exercice_id !~ '^module_\d+_exo_\d+$' THEN
    RAISE EXCEPTION 'Tentative d''origine uniquement (module_X_exo_Y)' USING ERRCODE = 'P0570';
  END IF;
  v_m := (regexp_match(_exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int;
  v_ex := (regexp_match(_exercice_id, '^module_(\d+)_exo_(\d+)$'))[2]::int;
  SELECT * INTO v_row FROM public.quiz_instantanes_ouverture qi
   WHERE qi.apprenant_id = _apprenant_id AND qi.exercice_id = _exercice_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_row.question_ids, v_row.empreinte, v_row.revision; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quiz_instantane_exercices qe WHERE qe.module_id = v_m AND qe.exercice_id = v_ex AND qe.actif) THEN
    RAISE EXCEPTION 'Instantané serveur non disponible pour ce quiz' USING ERRCODE = 'P0572';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reponses_apprenants r WHERE r.apprenant_id = _apprenant_id
              AND r.exercice_id = _exercice_id AND (r.status = 'submitted' OR r.created_at < (
                SELECT qe.active_le FROM public.quiz_instantane_exercices qe WHERE qe.module_id = v_m AND qe.exercice_id = v_ex))) THEN
    RAISE EXCEPTION 'Tentative antérieure à l''instantané : règle précédente conservée' USING ERRCODE = 'P0571';
  END IF;
  SELECT m.module_data, m.updated_at, m.source_fingerprint INTO v_data, v_rev, v_fp
    FROM public.module_editor_state m WHERE m.module_id = v_m;
  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Contenu du module illisible : réessayez' USING ERRCODE = 'P0573';
  END IF;
  SELECT e INTO v_exo FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_data->'exercices') = 'array' THEN v_data->'exercices' ELSE '[]'::jsonb END) e
   WHERE e->>'id' = v_ex::text AND coalesce(e->>'actif', 'true') <> 'false' LIMIT 1;
  IF v_exo IS NULL OR jsonb_typeof(v_exo->'questions') <> 'array' THEN
    RAISE EXCEPTION 'Quiz absent ou désactivé côté serveur' USING ERRCODE = 'P0573';
  END IF;
  SELECT array_agg(q->>'id' ORDER BY o), array_agg(md5(q::text) ORDER BY o) INTO v_ids, v_vers
    FROM jsonb_array_elements(v_exo->'questions') WITH ORDINALITY AS t(q, o)
   WHERE coalesce(q->>'actif', 'true') <> 'false'
     AND NOT COALESCE(jsonb_typeof(v_exo->'deletedQuestionIds') = 'array' AND v_exo->'deletedQuestionIds' @> jsonb_build_array(q->'id'), false);
  IF v_ids IS NULL OR EXISTS (SELECT 1 FROM unnest(v_ids) k WHERE k IS NULL OR btrim(k) = '')
     OR (SELECT count(DISTINCT k) FROM unnest(v_ids) k) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Liste serveur de questions invalide (vide ou en double)' USING ERRCODE = 'P0573';
  END IF;
  INSERT INTO public.quiz_instantanes_ouverture(apprenant_id, exercice_id, module_id, revision, source_fingerprint, question_ids, question_versions, empreinte, auteur_uid)
  VALUES (_apprenant_id, _exercice_id, v_m, v_rev, v_fp, v_ids, v_vers, md5(array_to_string(v_ids, chr(31)) || chr(30) || array_to_string(v_vers, chr(31))), auth.uid())
  ON CONFLICT (apprenant_id, exercice_id) DO NOTHING;
  SELECT * INTO v_row FROM public.quiz_instantanes_ouverture qi WHERE qi.apprenant_id = _apprenant_id AND qi.exercice_id = _exercice_id;
  RETURN QUERY SELECT v_row.question_ids, v_row.empreinte, v_row.revision;
END $$;
REVOKE ALL ON FUNCTION public.ouvrir_quiz_instantane(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ouvrir_quiz_instantane(uuid, text) TO authenticated;

-- Remise : pour un quiz à instantané, couverture exacte obligatoire ; aucune bascule silencieuse.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_apprenant_id uuid, _exercice_id text, _exercice_type text, _reponses jsonb, _score numeric DEFAULT NULL::numeric, _bonnes_reponses integer DEFAULT NULL::integer, _total_questions integer DEFAULT NULL::integer)
 RETURNS reponses_apprenants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.reponses_apprenants;
  _is_owner boolean;
  _m int; _ex int; _active_le timestamptz; _snap text[]; _cree timestamptz;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) INTO _is_owner;

  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF _exercice_id ~ '^module_\d+_exo_\d+$' THEN
    _m := (regexp_match(_exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int;
    _ex := (regexp_match(_exercice_id, '^module_(\d+)_exo_(\d+)$'))[2]::int;
    SELECT qe.active_le INTO _active_le FROM public.quiz_instantane_exercices qe
     WHERE qe.module_id = _m AND qe.exercice_id = _ex AND qe.actif;
    IF _active_le IS NOT NULL THEN
      SELECT qi.question_ids INTO _snap FROM public.quiz_instantanes_ouverture qi
       WHERE qi.apprenant_id = _apprenant_id AND qi.exercice_id = _exercice_id;
      IF _snap IS NULL THEN
        SELECT r.created_at INTO _cree FROM public.reponses_apprenants r
         WHERE r.apprenant_id = _apprenant_id AND r.exercice_id = _exercice_id;
        IF _cree IS NULL OR _cree >= _active_le THEN
          RAISE EXCEPTION 'Instantané serveur absent : rouvrez le quiz puis réessayez' USING ERRCODE = 'P0574';
        END IF;
        -- Tentative commencée avant l'activation : règle précédente (aucune réponse modifiée).
      ELSE
        IF EXISTS (SELECT 1 FROM unnest(_snap) k
                    WHERE NOT public.reponse_enregistree(COALESCE(_reponses, '{}'::jsonb) -> (_ex || '-' || k))) THEN
          RAISE EXCEPTION 'Réponses incomplètes par rapport à l''instantané serveur' USING ERRCODE = 'P0575';
        END IF;
        IF EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(_reponses, '{}'::jsonb)) k
                    WHERE k LIKE _ex || '-%' AND NOT (substr(k, length(_ex::text) + 2) = ANY (_snap))) THEN
          RAISE EXCEPTION 'Réponse à une question absente de l''instantané serveur' USING ERRCODE = 'P0576';
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.reponses_apprenants AS r (
    apprenant_id, user_id, exercice_id, exercice_type,
    reponses, score, bonnes_reponses, total_questions,
    completed, status, submitted_at, updated_at
  ) VALUES (
    _apprenant_id, COALESCE(auth.uid(), _apprenant_id), _exercice_id, _exercice_type,
    COALESCE(_reponses, '{}'::jsonb), _score, _bonnes_reponses, _total_questions,
    true, 'submitted', now(), now()
  )
  ON CONFLICT (apprenant_id, exercice_id) DO UPDATE SET
    exercice_type = EXCLUDED.exercice_type,
    reponses = CASE WHEN EXCLUDED.reponses = '{}'::jsonb THEN r.reponses ELSE EXCLUDED.reponses END,
    score = COALESCE(EXCLUDED.score, r.score),
    bonnes_reponses = COALESCE(EXCLUDED.bonnes_reponses, r.bonnes_reponses),
    total_questions = COALESCE(EXCLUDED.total_questions, r.total_questions),
    completed = true,
    status = 'submitted',
    submitted_at = COALESCE(r.submitted_at, now()),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.etat_completion_modules(_apprenant_id uuid)
 RETURNS TABLE(module_id integer, status text, completed_at timestamp with time zone, progress numeric, questions_requises integer, questions_prouvees integer, preuve_complete boolean, status_effectif text, progress_effectif numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH h_obligations AS MATERIALIZED (
    SELECT * FROM public.historique_obligations_modules(_apprenant_id)
  ), h_non_datees AS MATERIALIZED (
    SELECT * FROM public.obligations_non_datees_anterieures(_apprenant_id)
  ), c AS (
    SELECT amc.module_id, amc.status, amc.completed_at, amc.progress::numeric AS progress, amc.details
      FROM public.apprenant_module_completion amc
     WHERE amc.apprenant_id = _apprenant_id
  ), s AS (
    SELECT (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int AS m,
           (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[2] AS ex, r.reponses, r.submitted_at
      FROM public.reponses_apprenants r
     WHERE r.apprenant_id = _apprenant_id AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
       AND jsonb_typeof(r.reponses) = 'object' AND r.exercice_id ~ '^module_\d+_exo_\d+$'
  ), q0 AS (
    SELECT c.module_id, c.status AS mstatus, c.completed_at AS mdone,
           d->>'exerciceId' AS ex, d->>'questionId' AS qid,
           public.reponse_enregistree(d->'reponseEleve') AS rep
      FROM c, jsonb_array_elements(CASE WHEN jsonb_typeof(c.details) = 'array' THEN c.details ELSE '[]'::jsonb END) d
     WHERE jsonb_typeof(d) = 'object' AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
       AND NOT (jsonb_typeof(d->'reponseCorrecte') = 'array' AND jsonb_array_length(d->'reponseCorrecte') = 0)
  ), q_lyon AS (
    SELECT c.module_id, c.status AS mstatus, c.completed_at AS mdone,
      '1785332774763'::text AS ex, q::text AS qid,
      public.reponse_enregistree((SELECT reponses FROM public.reponses_apprenants
        WHERE apprenant_id=_apprenant_id AND exercice_id='module_8_exo_1785332774763' LIMIT 1)
        -> ('1785332774763-'||q)) AS rep
    FROM c CROSS JOIN generate_series(1,138) q
    WHERE c.module_id=8 AND EXISTS (SELECT 1 FROM public.quiz_lyon_cohortes WHERE apprenant_id=_apprenant_id)
  ), q_base AS (
    SELECT * FROM q0 WHERE NOT (q0.module_id=8 AND q0.ex='1785332774763'
      AND EXISTS (SELECT 1 FROM public.quiz_lyon_cohortes WHERE apprenant_id=_apprenant_id))
    UNION ALL SELECT * FROM q_lyon
  ), q AS (
    SELECT DISTINCT ON (q0.module_id, q0.ex, q0.qid) q0.module_id, q0.ex, q0.qid, q0.rep
      FROM q_base q0
      LEFT JOIN h_obligations h ON h.module_id = q0.module_id
        AND h.exercice_id = q0.ex AND h.question_id = q0.qid
      LEFT JOIN LATERAL (
        SELECT min(s.submitted_at) AS soumis FROM s WHERE s.m = q0.module_id AND s.ex = q0.ex
      ) p ON true
     WHERE NOT (h.supp IS NOT NULL AND (h.ajout IS NULL OR h.supp > h.ajout))
       AND NOT EXISTS (SELECT 1 FROM h_non_datees nd WHERE nd.module_id = q0.module_id
             AND nd.exercice_id = q0.ex AND nd.question_id = q0.qid)
       AND NOT (h.ajout IS NOT NULL AND h.ajout > LEAST(
             CASE WHEN q0.mstatus = 'completed' THEN q0.mdone END, p.soumis))
     ORDER BY q0.module_id, q0.ex, q0.qid, q0.rep DESC
  ), couverts AS (
    SELECT DISTINCT s.m, s.ex FROM s
     WHERE EXISTS (SELECT 1 FROM q WHERE q.module_id = s.m AND q.ex = s.ex)
       AND NOT EXISTS (SELECT 1 FROM q WHERE q.module_id = s.m AND q.ex = s.ex
                        AND NOT public.reponse_enregistree(s.reponses -> (s.ex || '-' || q.qid)))
  ), couverts_instantane AS (
    -- Instantané SERVEUR pris à l'ouverture de la tentative d'origine : le quiz est couvert
    -- seulement si chaque question de l'instantané a une réponse dans la remise.
    SELECT DISTINCT s.m, s.ex FROM s
      JOIN public.quiz_instantanes_ouverture qi
        ON qi.apprenant_id = _apprenant_id AND qi.exercice_id = 'module_' || s.m || '_exo_' || s.ex
     WHERE qi.created_at <= s.submitted_at AND cardinality(qi.question_ids) > 0
       AND NOT EXISTS (SELECT 1 FROM unnest(qi.question_ids) k
                        WHERE NOT public.reponse_enregistree(s.reponses -> (s.ex || '-' || k)))
  ), agg AS (
    SELECT q.module_id, count(*)::int AS req,
           count(*) FILTER (WHERE q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.m = q.module_id AND k.ex = q.ex)
                                OR EXISTS (SELECT 1 FROM couverts_instantane k WHERE k.m = q.module_id AND k.ex = q.ex))::int AS prv
      FROM q GROUP BY q.module_id
  ), v_admin AS (
    SELECT va.module_id
      FROM public.module_completion_validations_admin va
     WHERE va.apprenant_id = _apprenant_id
       AND jsonb_typeof(va.preuves) = 'array' AND jsonb_array_length(va.preuves) > 0
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(va.preuves) p
          WHERE NOT EXISTS (
            SELECT 1 FROM public.reponses_apprenants r
             WHERE r.apprenant_id = _apprenant_id
               AND r.exercice_id = p->>'exercice_id'
               AND r.status = 'submitted'
               AND r.submitted_at = (p->>'submitted_at')::timestamptz
               AND md5(r.reponses::text) = p->>'empreinte'))
  ), e AS (
    SELECT c.module_id, c.status, c.completed_at, c.progress,
           COALESCE(a.req, 0) AS req, COALESCE(a.prv, 0) AS prv,
           CASE
             WHEN c.module_id BETWEEN 35 AND 38 THEN true
             WHEN c.status = 'completed' AND EXISTS (SELECT 1 FROM v_admin v WHERE v.module_id = c.module_id) THEN true
             WHEN COALESCE(a.req, 0) = 0 THEN NULL
             ELSE a.prv = a.req
           END AS preuve
      FROM c LEFT JOIN agg a ON a.module_id = c.module_id
  )
  SELECT e.module_id, e.status, e.completed_at, e.progress, e.req, e.prv, e.preuve,
         CASE WHEN e.preuve IS FALSE THEN 'in_progress' ELSE e.status END,
         CASE WHEN e.preuve IS FALSE
              THEN LEAST(99.9, COALESCE(e.progress, 100), e.prv::numeric * 100 / e.req)
              ELSE e.progress END
    FROM e ORDER BY e.module_id
$function$;
