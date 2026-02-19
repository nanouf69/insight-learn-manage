
-- Table pour stocker les relevés de comptes bancaires
CREATE TABLE IF NOT EXISTS public.releves_bancaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_fichier TEXT NOT NULL,
  url TEXT NOT NULL,
  mois_annee TEXT NOT NULL,
  banque TEXT NOT NULL DEFAULT 'BNP Paribas',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.releves_bancaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage releves" ON public.releves_bancaires
  FOR ALL USING (true);

-- Bucket de stockage pour les relevés
INSERT INTO storage.buckets (id, name, public)
VALUES ('releves-bancaires', 'releves-bancaires', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all operations on releves-bancaires"
ON storage.objects FOR ALL
USING (bucket_id = 'releves-bancaires')
WITH CHECK (bucket_id = 'releves-bancaires');
