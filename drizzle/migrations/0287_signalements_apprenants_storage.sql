CREATE POLICY "Signalements: depot dans son dossier" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signalements-apprenants' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Signalements: lecture admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signalements-apprenants' AND public.has_role(auth.uid(), 'admin'::app_role));