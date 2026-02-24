
-- Create notes_frais table
CREATE TABLE public.notes_frais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  categorie TEXT NULL,
  fournisseur TEXT NULL,
  nom_fichier TEXT NULL,
  url TEXT NULL,
  notes TEXT NULL,
  statut TEXT NOT NULL DEFAULT 'a_traiter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes_frais ENABLE ROW LEVEL SECURITY;

-- Admin access
CREATE POLICY "Admins can manage notes_frais"
  ON public.notes_frais
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public read for comptable portal
CREATE POLICY "Public can select notes_frais"
  ON public.notes_frais
  FOR SELECT
  USING (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('notes-frais', 'notes-frais', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can manage notes-frais files"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'notes-frais' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read notes-frais files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'notes-frais');

-- Trigger for updated_at
CREATE TRIGGER update_notes_frais_updated_at
  BEFORE UPDATE ON public.notes_frais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
