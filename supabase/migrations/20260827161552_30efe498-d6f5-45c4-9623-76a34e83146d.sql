CREATE POLICY "Staff read documents-a-signer" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents-a-signer');
CREATE POLICY "Staff upload documents-a-signer" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents-a-signer');
CREATE POLICY "Staff update documents-a-signer" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents-a-signer');
CREATE POLICY "Staff delete documents-a-signer" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents-a-signer');