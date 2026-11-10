CREATE OR REPLACE FUNCTION public.corrige_officiel_actuel(p_attempt_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF coalesce(array_length(p_attempt_ids, 1), 0) > 50 THEN
    RAISE EXCEPTION 'TROP_DE_COPIES' USING ERRCODE = '22023';
  END IF;
  -- Lecture seule : uniquement les copies TERMINÉES du demandeur (ou admin).
  -- Le corrigé actuel n'est jamais révélé pour une copie en cours.
  WITH att AS (
    SELECT t.attempt_id, t.exam_id, t.snapshot
    FROM public.exam_attempts_v2 t
    WHERE t.attempt_id = ANY(p_attempt_ids)
      AND t.etat = 'terminee'
      AND (public.core_est_proprietaire(t.apprenant_id) OR public.has_role(auth.uid(), 'admin'))
  ), act AS (
    SELECT DISTINCT ON (v.exam_id) v.exam_id, v.version_number, v.published_at, v.content
    FROM public.exam_content_versions v
    WHERE v.exam_id IN (SELECT exam_id FROM att) AND v.statut = 'publiee' AND v.retired_at IS NULL AND NOT v.is_test
    ORDER BY v.exam_id, v.published_at DESC NULLS LAST
  ), snap AS (
    SELECT a.attempt_id, a.exam_id, q->>'id' AS qid,
      (SELECT coalesce(jsonb_agg(c->>'lettre' ORDER BY c->>'lettre'), '[]'::jsonb) FROM jsonb_array_elements(coalesce(q->'choix','[]'::jsonb)) c WHERE (c->>'correct')::boolean IS TRUE) AS k
    FROM att a, jsonb_array_elements(coalesce(a.snapshot->'questions','[]'::jsonb)) q
    WHERE q->>'type' = 'QCM'
  ), cur AS (
    SELECT a.exam_id, a.version_number, a.published_at, q->>'id' AS qid,
      (SELECT coalesce(jsonb_agg(c->>'lettre' ORDER BY c->>'lettre'), '[]'::jsonb) FROM jsonb_array_elements(coalesce(q->'choix','[]'::jsonb)) c WHERE (c->>'correct')::boolean IS TRUE) AS k
    FROM act a, jsonb_array_elements(coalesce(a.content->'questions','[]'::jsonb)) q
    WHERE q->>'type' = 'QCM'
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'attempt_id', s.attempt_id, 'question_id', s.qid,
      'bonnes_passage', s.k, 'bonnes_actuelles', c.k,
      'version', c.version_number, 'publiee_le', c.published_at)), '[]'::jsonb)
  INTO v_out
  FROM snap s JOIN cur c ON c.exam_id = s.exam_id AND c.qid = s.qid
  WHERE s.k <> c.k AND jsonb_array_length(c.k) > 0;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.corrige_officiel_actuel(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.corrige_officiel_actuel(uuid[]) TO authenticated, service_role;