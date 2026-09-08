DO $$
BEGIN
  IF has_function_privilege('anon', 'public.sync_admin_canonical_quiz_questions(integer,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anonymous_access_not_allowed';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.sync_admin_canonical_quiz_questions(integer,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated_admin_rpc_unavailable';
  END IF;
END;
$$;