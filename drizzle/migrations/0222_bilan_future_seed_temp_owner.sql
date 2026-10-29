-- Temporary: allow the requesting project owner account to run the one-shot seed (revoked right after).
CREATE OR REPLACE FUNCTION public.bilan_future_seed(p_subject integer,p_questions jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE vid uuid;
BEGIN
  IF NOT (coalesce(public.has_role(auth.uid(),'admin'),false) OR auth.uid()='89354720-37ec-4431-8f29-77108e0657e0'::uuid) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.bilan_future_active WHERE subject=p_subject) THEN RAISE EXCEPTION 'Subject already active' USING ERRCODE='P0491'; END IF;
  IF jsonb_typeof(p_questions)<>'array' OR jsonb_array_length(p_questions)=0
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_questions) q WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true')) THEN
    RAISE EXCEPTION 'Invalid bank' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.bilan_future_versions(subject,questions,fingerprint) VALUES(p_subject,p_questions,md5(p_questions::text)) RETURNING id INTO vid;
  INSERT INTO public.bilan_future_active(subject,version_id) VALUES(p_subject,vid);
  RETURN vid;
END $$;