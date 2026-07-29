ALTER POLICY "Admins peuvent modifier des fichiers de cours"
ON storage.objects
USING (
  bucket_id = 'cours-fichiers'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'cours-fichiers'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);