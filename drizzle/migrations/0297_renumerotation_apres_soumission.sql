CREATE OR REPLACE FUNCTION public.obligations_non_datees_anterieures(_apprenant_id uuid)
 RETURNS TABLE(module_id integer, exercice_id text, question_id text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND (auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND (a.auth_user_id = auth.uid() OR a.id = auth.uid())
    )
  )) THEN
    RAISE EXCEPTION 'Accès au dossier non autorisé.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH k AS (
    SELECT DISTINCT amc.module_id AS m, d->>'exerciceId' AS ex, d->>'questionId' AS qid
      FROM public.apprenant_module_completion amc,
           jsonb_array_elements(CASE WHEN jsonb_typeof(amc.details) = 'array' THEN amc.details ELSE '[]'::jsonb END) d
     WHERE amc.apprenant_id = _apprenant_id AND jsonb_typeof(d) = 'object'
       AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
       AND NOT public.reponse_enregistree(d->'reponseEleve')
       AND NOT EXISTS (SELECT 1 FROM public.module_admin_audit_log l
             WHERE l.module_id = amc.module_id AND l.exercice_id = d->>'exerciceId' AND l.question_id = d->>'questionId'
               AND l.field IN ('question_added', 'question_deleted'))
  )
  SELECT k.m, k.ex, k.qid FROM k
    JOIN public.reponses_apprenants s ON s.apprenant_id = _apprenant_id
     AND s.exercice_id = 'module_' || k.m || '_exo_' || k.ex
     AND s.status = 'submitted' AND s.submitted_at IS NOT NULL AND jsonb_typeof(s.reponses) = 'object'
   WHERE NOT (s.reponses ? (k.ex || '-' || k.qid))
     AND EXISTS (SELECT 1 FROM jsonb_object_keys(s.reponses) key
                   JOIN public.module_admin_audit_log l ON l.module_id = k.m AND l.exercice_id = k.ex
                    AND l.question_id = substr(key, length(k.ex) + 2)
                    AND l.field = 'question_deleted' AND l.created_at > s.submitted_at
                  WHERE key LIKE k.ex || '-%')
     AND NOT EXISTS (SELECT 1 FROM public.reponses_apprenants o
                      WHERE o.exercice_id = s.exercice_id AND jsonb_typeof(o.reponses) = 'object'
                        AND o.reponses ? (k.ex || '-' || k.qid)
                        AND LEAST(o.created_at, o.updated_at, coalesce(o.submitted_at, o.updated_at)) <= s.submitted_at);
END;
$fn$;
REVOKE ALL ON FUNCTION public.obligations_non_datees_anterieures(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obligations_non_datees_anterieures(uuid) TO authenticated, service_role;

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
  ), agg AS (
    SELECT q.module_id, count(*)::int AS req,
           count(*) FILTER (WHERE q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.m = q.module_id AND k.ex = q.ex))::int AS prv
      FROM q GROUP BY q.module_id
  ), e AS (
    SELECT c.module_id, c.status, c.completed_at, c.progress,
           COALESCE(a.req, 0) AS req, COALESCE(a.prv, 0) AS prv,
           CASE
             WHEN c.module_id BETWEEN 35 AND 38 THEN true
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