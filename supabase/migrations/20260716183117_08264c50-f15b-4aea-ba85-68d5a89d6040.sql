-- Autoriser les utilisateurs authentifiés (admins, formateurs, staff) à gérer les images de questions
-- dans le bucket cours-fichiers sous le préfixe question-images/
CREATE POLICY "Authenticated peuvent uploader images questions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = 'question-images'
);

CREATE POLICY "Authenticated peuvent modifier images questions"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = 'question-images'
);

CREATE POLICY "Authenticated peuvent supprimer images questions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cours-fichiers'
  AND (storage.foldername(name))[1] = 'question-images'
);