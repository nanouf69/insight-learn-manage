
CREATE TABLE IF NOT EXISTS public.justificatifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_fichier TEXT NOT NULL,
  url TEXT NOT NULL,
  montant_ttc NUMERIC,
  date_operation DATE,
  categorie TEXT,
  fournisseur TEXT,
  description TEXT,
  statut TEXT NOT NULL DEFAULT 'a_traiter',
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.justificatifs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage justificatifs"
ON public.justificatifs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('justificatifs', 'justificatifs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all on justificatifs bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'justificatifs')
WITH CHECK (bucket_id = 'justificatifs');

CREATE TRIGGER update_justificatifs_updated_at
BEFORE UPDATE ON public.justificatifs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
