CREATE OR REPLACE FUNCTION public.bilan_future_correction(p_receipt uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.bilan_future_receipts; v public.bilan_future_versions; s public.bilan_future_submissions;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id = p_receipt AND owner_id = auth.uid();
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receipt ownership required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM public.bilan_future_submissions WHERE receipt_id = r.id;
  IF s.receipt_id IS NULL THEN RAISE EXCEPTION 'Correction disponible après remise' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v FROM public.bilan_future_versions WHERE id = r.version_id;
  RETURN jsonb_build_object('receipt_id', r.id, 'version_id', v.id, 'submitted_at', s.submitted_at,
    'correct_count', s.correct_count, 'question_count', s.question_count,
    'questions', (SELECT jsonb_agg(jsonb_build_object(
        'id', q->'id',
        'answer', coalesce(s.answers->(q->>'id'), '[]'::jsonb),
        'correct', coalesce((SELECT jsonb_agg(c->>'lettre' ORDER BY c->>'lettre') FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct' = 'true'), '[]'::jsonb),
        'explication', q->'explication') ORDER BY n)
      FROM jsonb_array_elements(v.questions) WITH ORDINALITY AS y(q, n)));
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_correction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bilan_future_correction(uuid) TO authenticated;