DROP POLICY IF EXISTS "Authenticated peuvent voir images questions" ON storage.objects;
CREATE POLICY "Authenticated peuvent voir images questions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = 'question-images'
);

DROP POLICY IF EXISTS "Authenticated peuvent modifier images questions" ON storage.objects;
CREATE POLICY "Authenticated peuvent modifier images questions"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = 'question-images'
)
WITH CHECK (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = 'question-images'
);