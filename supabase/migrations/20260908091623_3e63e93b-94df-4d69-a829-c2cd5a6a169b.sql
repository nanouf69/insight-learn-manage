DO $$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.sync_admin_canonical_quiz_questions(integer,jsonb)'::regprocedure);
  IF definition LIKE '%active=true%' OR definition LIKE '%active = true,%' THEN
    RAISE EXCEPTION 'deleted_question_reactivation_path_still_present';
  END IF;
  IF has_function_privilege('anon', 'public.sync_admin_canonical_quiz_questions(integer,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anonymous_execution_still_enabled';
  END IF;
END;
$$;