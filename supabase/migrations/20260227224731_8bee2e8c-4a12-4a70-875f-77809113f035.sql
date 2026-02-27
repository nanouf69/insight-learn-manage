-- Bucket pour stocker les fichiers de cours (PowerPoint, PDF, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('cours-fichiers', 'cours-fichiers', true);

-- Politique de lecture publique pour les fichiers de cours
CREATE POLICY "Fichiers de cours accessibles publiquement"
ON storage.objects FOR SELECT
USING (bucket_id = 'cours-fichiers');

-- Seuls les admins peuvent uploader des fichiers de cours
CREATE POLICY "Admins peuvent uploader des fichiers de cours"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cours-fichiers'
  AND public.has_role(auth.uid(), 'admin')
);

-- Seuls les admins peuvent supprimer des fichiers de cours
CREATE POLICY "Admins peuvent supprimer des fichiers de cours"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cours-fichiers'
  AND public.has_role(auth.uid(), 'admin')
);

-- Seuls les admins peuvent modifier des fichiers de cours
CREATE POLICY "Admins peuvent modifier des fichiers de cours"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cours-fichiers'
  AND public.has_role(auth.uid(), 'admin')
);