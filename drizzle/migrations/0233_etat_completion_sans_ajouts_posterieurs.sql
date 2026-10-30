CREATE INDEX IF NOT EXISTS idx_module_admin_audit_log_question
  ON public.module_admin_audit_log (module_id, exercice_id, question_id, field, created_at);

CREATE OR REPLACE FUNCTION public.etat_completion_modules(_apprenant_id uuid)
 RETURNS TABLE(module_id integer, status text, completed_at timestamp with time zone, progress numeric, questions_requises integer, questions_prouvees integer, preuve_complete boolean, status_effectif text, progress_effectif numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH c AS (
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
  ), q AS (
    -- Exigence figée : une question ajoutée après la validation du module
    -- (ou après la première soumission de son exercice), ou supprimée depuis,
    -- n'est jamais exigée rétroactivement. Les réponses restent intactes.
    SELECT DISTINCT ON (q0.module_id, q0.ex, q0.qid) q0.module_id, q0.ex, q0.qid, q0.rep
      FROM q0
      LEFT JOIN LATERAL (
        SELECT max(l.created_at) FILTER (WHERE l.field = 'question_added') AS ajout,
               max(l.created_at) FILTER (WHERE l.field = 'question_deleted') AS supp
          FROM public.module_admin_audit_log l
         WHERE l.module_id = q0.module_id AND l.exercice_id = q0.ex AND l.question_id = q0.qid
           AND l.field IN ('question_added', 'question_deleted')
      ) h ON true
      LEFT JOIN LATERAL (
        SELECT min(s.submitted_at) AS soumis FROM s WHERE s.m = q0.module_id AND s.ex = q0.ex
      ) p ON true
     WHERE NOT (h.supp IS NOT NULL AND (h.ajout IS NULL OR h.supp > h.ajout))
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