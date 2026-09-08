ALTER FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) TO authenticated, service_role;