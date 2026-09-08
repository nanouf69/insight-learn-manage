DO $$
DECLARE
  admin_update_policy boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quiz_questions'
      AND cmd IN ('UPDATE', 'ALL')
  ) INTO admin_update_policy;
  IF NOT admin_update_policy THEN
    RAISE EXCEPTION 'quiz_questions_update_policy_missing';
  END IF;
END;
$$;