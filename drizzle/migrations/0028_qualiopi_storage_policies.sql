CREATE POLICY "Admins read qualiopi preuves" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'qualiopi-preuves' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload qualiopi preuves" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qualiopi-preuves' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update qualiopi preuves" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'qualiopi-preuves' AND public.has_role(auth.uid(), 'admin'::app_role));