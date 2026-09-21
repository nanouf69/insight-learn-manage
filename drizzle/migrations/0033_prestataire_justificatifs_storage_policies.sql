CREATE POLICY "Admins read prestataire justificatifs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'prestataire-justificatifs' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload prestataire justificatifs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prestataire-justificatifs' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update prestataire justificatifs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'prestataire-justificatifs' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete prestataire justificatifs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'prestataire-justificatifs' AND public.has_role(auth.uid(), 'admin'::app_role));