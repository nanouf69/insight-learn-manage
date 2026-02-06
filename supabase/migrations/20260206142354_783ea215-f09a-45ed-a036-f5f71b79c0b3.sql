-- Create storage bucket for inscription documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-inscription', 'documents-inscription', false);

-- RLS policies for documents-inscription bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload inscription documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents-inscription');

-- Allow anyone to read files (for admin viewing)
CREATE POLICY "Anyone can view inscription documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents-inscription');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update inscription documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents-inscription');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete inscription documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents-inscription');