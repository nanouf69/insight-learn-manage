DO $$
DECLARE
  is_definer boolean;
  anon_can_execute boolean;
BEGIN
  SELECT p.prosecdef INTO is_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'sync_admin_canonical_quiz_questions'
    AND pg_get_function_identity_arguments(p.oid) = 'p_module_id integer, p_exercises jsonb';

  SELECT has_function_privilege('anon', 'public.sync_admin_canonical_quiz_questions(integer,jsonb)', 'EXECUTE')
  INTO anon_can_execute;

  IF is_definer IS DISTINCT FROM false OR anon_can_execute IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'canonical_sync_security_regression';
  END IF;
END;
$$;