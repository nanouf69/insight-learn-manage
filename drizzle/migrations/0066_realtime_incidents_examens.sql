DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_attempts_v2;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.core_exam_results;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;