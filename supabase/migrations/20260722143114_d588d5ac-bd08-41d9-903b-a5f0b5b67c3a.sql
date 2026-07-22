
-- 1. Fix apprenant_questions staff policy: require admin role
DROP POLICY IF EXISTS "Staff full access questions" ON public.apprenant_questions;
CREATE POLICY "Admins full access questions"
ON public.apprenant_questions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Remove public read on quiz_questions_overrides
DROP POLICY IF EXISTS "Public can read quiz_overrides" ON public.quiz_questions_overrides;

-- 3. Restrict error_logs INSERT to caller identity (or null for anon errors)
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Users can insert own error logs"
ON public.error_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 4. Restrict module_admin_audit_log INSERT to own author
DROP POLICY IF EXISTS "Authenticated can insert module audit log" ON public.module_admin_audit_log;
CREATE POLICY "Authenticated can insert own module audit log"
ON public.module_admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (author_user_id IS NULL OR author_user_id = auth.uid());

-- 5. Drop any public/anon upload policy on documents-inscription bucket
DROP POLICY IF EXISTS "Allow public upload to documents-inscription" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload documents-inscription" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload documents-inscription" ON storage.objects;

-- 6. Revoke anon EXECUTE from SECURITY DEFINER functions exposed via the Data API.
-- The onboarding welcome page currently calls search_apprenant_onboarding as anon; that call
-- must be moved to an edge function or made authenticated. log_error remains callable from
-- anon so client-side crash reporting keeps working.
REVOKE EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) TO authenticated, service_role;
