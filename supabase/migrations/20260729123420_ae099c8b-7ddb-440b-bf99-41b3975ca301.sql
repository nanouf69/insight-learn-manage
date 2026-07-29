CREATE POLICY "Utilisateurs connectés peuvent lire les fichiers de cours"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] IN ('cours-images', 'vtc')
);