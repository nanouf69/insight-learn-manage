DROP POLICY IF EXISTS "Admins manage fournisseur-documents" ON storage.objects;
CREATE POLICY "Admins manage fournisseur-documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'fournisseur-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'fournisseur-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated can read quiz_overrides" ON public.quiz_questions_overrides;
CREATE POLICY "Admins can read quiz_overrides"
ON public.quiz_questions_overrides FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.save_module_editor_state(integer, jsonb, jsonb, jsonb, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.trigger_auto_send_pratique_booking() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.log_error(text, text, text, text, text, text, text, text, uuid, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_error(text, text, text, text, text, text, text, text, uuid, text, jsonb, text) TO anon, authenticated, service_role;