ALTER POLICY "Utilisateurs connectés peuvent lire les fichiers de cours"
ON storage.objects
USING (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = ANY (ARRAY['cours-images', 'cours-pdfs', 'vtc'])
);