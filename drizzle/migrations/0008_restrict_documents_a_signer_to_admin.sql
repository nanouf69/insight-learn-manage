DROP POLICY IF EXISTS "Authenticated staff manage documents_a_signer" ON public.documents_a_signer;
CREATE POLICY "Admins manage documents_a_signer"
ON public.documents_a_signer
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read documents-a-signer" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload documents-a-signer" ON storage.objects;
DROP POLICY IF EXISTS "Staff update documents-a-signer" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete documents-a-signer" ON storage.objects;

CREATE POLICY "Admins read documents-a-signer"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents-a-signer' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload documents-a-signer"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents-a-signer' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update documents-a-signer"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents-a-signer' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'documents-a-signer' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete documents-a-signer"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents-a-signer' AND public.has_role(auth.uid(), 'admin'));