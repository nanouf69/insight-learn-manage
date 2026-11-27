-- 0305 — Liste serveur, immuable, des questions affichées pour chaque tentative d'origine d'un quiz.
-- Pour les nouvelles remises, la fin de module se vérifie contre cette liste (couverture exacte),
-- et non plus seulement contre les numéros du relevé. Additif : aucune réponse, tentative, note ni relevé modifié.

CREATE TABLE public.quiz_questions_affichees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  exercice_id text NOT NULL,
  question_ids text[] NOT NULL,
  empreinte text NOT NULL,
  auteur_uid uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_questions_affichees_unique UNIQUE (apprenant_id, exercice_id)
);
COMMENT ON TABLE public.quiz_questions_affichees IS
  'Append-only : identifiants exacts des questions affichées pour la tentative d''origine (module_X_exo_Y), enregistrés avant la remise.';

GRANT SELECT ON public.quiz_questions_affichees TO authenticated;
GRANT ALL ON public.quiz_questions_affichees TO service_role;
ALTER TABLE public.quiz_questions_affichees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins et apprenant concerné lisent les questions affichées"
  ON public.quiz_questions_affichees FOR SELECT TO authenticated
  USING ((select public.has_role((select auth.uid()), 'admin')) OR public.est_proprietaire_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.quiz_questions_affichees_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'quiz_questions_affichees est en ajout seul' USING ERRCODE = 'P0564';
END $$;
CREATE TRIGGER trg_quiz_questions_affichees_append_only
  BEFORE UPDATE OR DELETE ON public.quiz_questions_affichees
  FOR EACH ROW EXECUTE FUNCTION public.quiz_questions_affichees_append_only();

-- Enregistre (une seule fois) la liste affichée ; renvoie toujours la liste conservée par le serveur.
CREATE OR REPLACE FUNCTION public.enregistrer_questions_affichees(_apprenant_id uuid, _exercice_id text, _question_ids text[])
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids text[];
BEGIN
  IF NOT (public.est_proprietaire_apprenant(_apprenant_id) OR COALESCE(public.has_role(auth.uid(), 'admin'), false)) THEN
    RAISE EXCEPTION 'Accès au dossier non autorisé' USING ERRCODE = '42501';
  END IF;
  IF _exercice_id IS NULL OR _exercice_id !~ '^module_\d+_exo_\d+$' THEN
    RAISE EXCEPTION 'Tentative d''origine uniquement (module_X_exo_Y)' USING ERRCODE = 'P0560';
  END IF;
  IF _question_ids IS NULL OR cardinality(_question_ids) = 0 OR cardinality(_question_ids) > 2000
     OR EXISTS (SELECT 1 FROM unnest(_question_ids) k WHERE k IS NULL OR btrim(k) = '' OR k <> btrim(k))
     OR (SELECT count(DISTINCT k) FROM unnest(_question_ids) k) <> cardinality(_question_ids) THEN
    RAISE EXCEPTION 'Liste de questions invalide (vide, vide d''identifiant ou en double)' USING ERRCODE = 'P0562';
  END IF;
  SELECT qa.question_ids INTO v_ids FROM public.quiz_questions_affichees qa
   WHERE qa.apprenant_id = _apprenant_id AND qa.exercice_id = _exercice_id;
  IF v_ids IS NOT NULL THEN RETURN v_ids; END IF;
  IF EXISTS (SELECT 1 FROM public.reponses_apprenants r WHERE r.apprenant_id = _apprenant_id
              AND r.exercice_id = _exercice_id AND r.status = 'submitted') THEN
    RAISE EXCEPTION 'Tentative déjà remise : liste non enregistrable après coup' USING ERRCODE = 'P0561';
  END IF;
  INSERT INTO public.quiz_questions_affichees (apprenant_id, exercice_id, question_ids, empreinte, auteur_uid)
  VALUES (_apprenant_id, _exercice_id, _question_ids, md5(array_to_string(_question_ids, chr(31))), auth.uid())
  ON CONFLICT (apprenant_id, exercice_id) DO NOTHING;
  SELECT qa.question_ids INTO v_ids FROM public.quiz_questions_affichees qa
   WHERE qa.apprenant_id = _apprenant_id AND qa.exercice_id = _exercice_id;
  RETURN v_ids;
END $$;
REVOKE ALL ON FUNCTION public.enregistrer_questions_affichees(uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_questions_affichees(uuid, text, text[]) TO authenticated, service_role;

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
  ), couverts_affiches AS (
    -- Liste serveur des questions affichées, enregistrée AVANT la remise d'origine :
    -- le quiz est couvert seulement si chacune de ces questions a une réponse remise.
    SELECT DISTINCT s.m, s.ex FROM s
      JOIN public.quiz_questions_affichees qa
        ON qa.apprenant_id = _apprenant_id AND qa.exercice_id = 'module_' || s.m || '_exo_' || s.ex
     WHERE qa.created_at <= s.submitted_at AND cardinality(qa.question_ids) > 0
       AND NOT EXISTS (SELECT 1 FROM unnest(qa.question_ids) k
                        WHERE NOT public.reponse_enregistree(s.reponses -> (s.ex || '-' || k)))
  ), agg AS (
    SELECT q.module_id, count(*)::int AS req,
           count(*) FILTER (WHERE q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.m = q.module_id AND k.ex = q.ex)
                                OR EXISTS (SELECT 1 FROM couverts_affiches k WHERE k.m = q.module_id AND k.ex = q.ex))::int AS prv
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
