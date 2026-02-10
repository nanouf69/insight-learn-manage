-- Allow anonymous UPDATE on apprenants for onboarding (step 12 updates exam info)
CREATE POLICY "Allow public update for onboarding"
ON public.apprenants
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous INSERT on documents_inscription for onboarding uploads
CREATE POLICY "Allow public insert documents_inscription"
ON public.documents_inscription
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous SELECT on documents_inscription for onboarding
CREATE POLICY "Allow public select documents_inscription"
ON public.documents_inscription
FOR SELECT
TO anon
USING (true);

-- Allow anonymous UPDATE on documents_inscription for onboarding
CREATE POLICY "Allow public update documents_inscription"
ON public.documents_inscription
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Storage: allow anonymous uploads to documents-inscription bucket
CREATE POLICY "Allow public upload to documents-inscription"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents-inscription');

-- Storage: allow anonymous read from documents-inscription bucket
CREATE POLICY "Allow public read documents-inscription"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'documents-inscription');
