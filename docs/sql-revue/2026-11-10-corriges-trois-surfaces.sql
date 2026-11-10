-- Read-only candidate. No write to answers, grades, versions or attempts.
CREATE OR REPLACE FUNCTION public.corriges_officiels_sources(p_attempt_ids uuid[], p_result_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  IF coalesce(cardinality(p_attempt_ids),0)+coalesce(cardinality(p_result_ids),0)>50 THEN
    RAISE EXCEPTION 'TROP_DE_COPIES' USING ERRCODE='22023';
  END IF;
  WITH sources AS (
    SELECT 'attempt'::text AS source_type, t.attempt_id AS source_id, t.exam_id AS exam_id,
      t.snapshot->>'matiere' AS matiere_id, t.snapshot->'questions' AS questions
    FROM public.exam_attempts_v2 t
    WHERE t.attempt_id=ANY(p_attempt_ids) AND t.etat='terminee'
      AND (public.core_est_proprietaire(t.apprenant_id) OR public.has_role(auth.uid(),'admin'))
    UNION ALL
    SELECT 'result', r.id, r.quiz_id, r.matiere_id, r.details#>'{snapshot,questions}'
    FROM public.apprenant_quiz_results r
    WHERE r.id=ANY(p_result_ids) AND r.quiz_type='examen_blanc' AND r.completed_at IS NOT NULL
      AND jsonb_typeof(r.details#>'{snapshot,questions}')='array'
      AND (public.core_est_proprietaire(r.apprenant_id) OR public.has_role(auth.uid(),'admin'))
  ), active AS (
    SELECT DISTINCT ON (v.exam_id) v.exam_id,v.version_number,v.published_at,v.content
    FROM public.exam_content_versions v
    WHERE v.exam_id IN (SELECT exam_id FROM sources) AND v.statut='publiee'
      AND v.retired_at IS NULL AND NOT v.is_test
    ORDER BY v.exam_id,v.published_at DESC NULLS LAST,v.version_number DESC,v.id DESC
  ), frozen AS (
    SELECT s.*,q AS historique,
      CASE WHEN q->>'id' LIKE s.matiere_id||':%' THEN q->>'id'
           ELSE s.matiere_id||':'||(q->>'id') END AS qid
    FROM sources s CROSS JOIN LATERAL jsonb_array_elements(s.questions) q
    WHERE jsonb_typeof(s.questions)='array'
  ), compared AS (
    SELECT f.*,a.version_number,a.published_at,c.q AS actuelle,c.n,
      (SELECT count(*) FROM frozen z WHERE z.source_type=f.source_type AND z.source_id=f.source_id AND z.qid=f.qid) AS frozen_n
    FROM frozen f LEFT JOIN active a ON a.exam_id=f.exam_id
    LEFT JOIN LATERAL (
      SELECT (jsonb_agg(q))->0 AS q,count(*) AS n
      FROM jsonb_array_elements(coalesce(a.content->'questions','[]'::jsonb)) q WHERE q->>'id'=f.qid
    ) c ON true
  ), proof AS (
    SELECT *,coalesce(frozen_n=1 AND n=1
      AND historique->>'type'=actuelle->>'type'
      AND historique->>'enonce'=actuelle->>'enonce'
      AND (historique->>'type'='QRC' OR (
        (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre') FROM jsonb_array_elements(coalesce(historique->'choix','[]'::jsonb)) c)
        = (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre') FROM jsonb_array_elements(coalesce(actuelle->'choix','[]'::jsonb)) c)
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(actuelle->'choix','[]'::jsonb)) c WHERE c->>'correct'='true')
      )),false) AS matched
    FROM compared
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'source_type',source_type,'source_id',source_id,'exam_id',exam_id,'question_id',qid,
    'historique',historique,'actuelle',CASE WHEN matched THEN actuelle ELSE NULL END,
    'version',version_number,'publiee_le',published_at,
    'statut',CASE WHEN matched THEN 'rapproche' ELSE 'non_rapproche' END
  ) ORDER BY source_type,source_id,qid),'[]'::jsonb) INTO v_out FROM proof;
  RETURN v_out;
END; $$;
REVOKE ALL ON FUNCTION public.corriges_officiels_sources(uuid[],uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.corriges_officiels_sources(uuid[],uuid[]) TO authenticated,service_role;