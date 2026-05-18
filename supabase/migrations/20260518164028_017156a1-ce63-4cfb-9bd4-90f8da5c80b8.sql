CREATE TABLE public.contrats_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'franchise',
  titre TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'brouillon',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  destinataire_email TEXT,
  destinataire_nom TEXT,
  sent_at TIMESTAMPTZ,
  representant_nom TEXT,
  lieu_signature TEXT,
  signature_data_url TEXT,
  signed_at TIMESTAMPTZ,
  signed_pdf_url TEXT,
  signed_pdf_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contrats_fournisseur ON public.contrats_fournisseurs(fournisseur_id);
CREATE INDEX idx_contrats_token ON public.contrats_fournisseurs(token);

ALTER TABLE public.contrats_fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contrats"
ON public.contrats_fournisseurs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_contrats_fournisseurs_updated
BEFORE UPDATE ON public.contrats_fournisseurs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();