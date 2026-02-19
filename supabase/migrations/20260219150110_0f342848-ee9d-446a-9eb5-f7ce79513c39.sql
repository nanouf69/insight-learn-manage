
-- Table de documents partagés entre admin et fournisseur/formateur
CREATE TABLE IF NOT EXISTS public.fournisseur_shared_docs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fournisseur_id uuid NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  nom_fichier text NOT NULL,
  titre text NOT NULL,
  description text,
  url text NOT NULL,
  uploaded_by text NOT NULL DEFAULT 'admin', -- 'admin' ou 'fournisseur'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.fournisseur_shared_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fournisseur_shared_docs"
  ON public.fournisseur_shared_docs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can select fournisseur_shared_docs"
  ON public.fournisseur_shared_docs FOR SELECT
  USING (true);

CREATE POLICY "Public can insert fournisseur_shared_docs"
  ON public.fournisseur_shared_docs FOR INSERT
  WITH CHECK (true);

-- Bucket pour les documents partagés
INSERT INTO storage.buckets (id, name, public)
VALUES ('fournisseur-shared-docs', 'fournisseur-shared-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload to fournisseur-shared-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fournisseur-shared-docs');

CREATE POLICY "Public can view fournisseur-shared-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fournisseur-shared-docs');
