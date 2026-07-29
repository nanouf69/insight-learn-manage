DROP POLICY IF EXISTS "Authenticated peuvent uploader images questions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated peuvent modifier images questions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated peuvent supprimer images questions" ON storage.objects;

CREATE POLICY "Admins peuvent uploader images questions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cours-fichiers'
    AND (storage.foldername(name))[1] = 'question-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins peuvent modifier images questions"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cours-fichiers'
    AND (storage.foldername(name))[1] = 'question-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'cours-fichiers'
    AND (storage.foldername(name))[1] = 'question-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins peuvent supprimer images questions"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cours-fichiers'
    AND (storage.foldername(name))[1] = 'question-images'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
