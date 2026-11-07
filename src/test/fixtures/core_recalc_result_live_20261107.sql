CREATE OR REPLACE FUNCTION public.core_recalc_result(p_attempt_id uuid)
 RETURNS core_exam_results
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  att public.exam_attempts_v2;
  n record;
  res public.core_exam_results;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF att IS NULL THEN
    RAISE EXCEPTION 'ATTEMPT_INCONNUE: %', p_attempt_id USING ERRCODE = 'P0475';
  END IF;

  SELECT * INTO n FROM public.core_note_attempt(p_attempt_id);

  INSERT INTO public.core_exam_results (attempt_id, apprenant_id, result_revision, status, score, total, qrc_restantes, published_at)
  VALUES (p_attempt_id, att.apprenant_id, 1,
          CASE WHEN n.qrc_restantes = 0 THEN 'definitif' ELSE 'provisoire' END,
          n.score20, n.total, n.qrc_restantes,
          CASE WHEN n.qrc_restantes = 0 THEN now() ELSE NULL END)
  ON CONFLICT (attempt_id) DO UPDATE SET
    result_revision = public.core_exam_results.result_revision + 1,
    status = EXCLUDED.status,
    score = EXCLUDED.score,
    total = EXCLUDED.total,
    qrc_restantes = EXCLUDED.qrc_restantes,
    published_at = CASE WHEN EXCLUDED.status = 'definitif'
                        THEN coalesce(public.core_exam_results.published_at, now()) ELSE NULL END,
    updated_at = now()
  RETURNING * INTO res;

  RETURN res;
END;
$function$

