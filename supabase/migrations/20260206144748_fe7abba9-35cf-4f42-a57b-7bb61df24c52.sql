-- Make the documents-inscription bucket public so files can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documents-inscription';