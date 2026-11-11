-- Writes only through admin_authorize_exam_subject_reset (SECURITY DEFINER); clients read via RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exam_subject_reset_authorizations FROM authenticated;
REVOKE ALL ON public.exam_subject_reset_authorizations FROM anon;