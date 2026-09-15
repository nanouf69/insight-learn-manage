REVOKE EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) TO service_role;