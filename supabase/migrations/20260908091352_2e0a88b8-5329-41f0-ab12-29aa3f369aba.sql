ALTER FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) TO authenticated, service_role;