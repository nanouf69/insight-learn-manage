-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all access to documents_inscription" ON public.documents_inscription;

-- Create permissive policies for documents_inscription
CREATE POLICY "Allow public read documents_inscription"
ON public.documents_inscription
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert documents_inscription"
ON public.documents_inscription
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update documents_inscription"
ON public.documents_inscription
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete documents_inscription"
ON public.documents_inscription
FOR DELETE
USING (true);