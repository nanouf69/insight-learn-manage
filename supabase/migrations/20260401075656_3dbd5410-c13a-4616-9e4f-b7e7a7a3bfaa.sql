
-- Table pour stocker les devis envoyés
CREATE TABLE public.devis_envois (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID REFERENCES public.apprenants(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  modele TEXT NOT NULL,
  montant TEXT,
  formation TEXT,
  fichier_url TEXT NOT NULL,
  devis_signe_url TEXT,
  statut TEXT NOT NULL DEFAULT 'envoye',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_at TIMESTAMP WITH TIME ZONE
);

-- RLS
ALTER TABLE public.devis_envois ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage devis_envois"
  ON public.devis_envois FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public read by token (pour la page publique)
CREATE POLICY "Public can select devis by token"
  ON public.devis_envois FOR SELECT
  TO public
  USING (true);

-- Public update for signed upload
CREATE POLICY "Public can update devis signe"
  ON public.devis_envois FOR UPDATE
  TO public
  USING (devis_signe_url IS NULL)
  WITH CHECK (devis_signe_url IS NOT NULL);

-- Bucket pour stocker les devis
INSERT INTO storage.buckets (id, name, public) VALUES ('devis', 'devis', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can read devis files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'devis');

CREATE POLICY "Admins can upload devis files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'devis' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Public can upload signed devis"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'devis' AND (storage.foldername(name))[1] = 'signes');
