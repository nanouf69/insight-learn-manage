
CREATE TABLE public.facture_paiements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id uuid NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  date_paiement date NOT NULL,
  moyen_paiement text NOT NULL,
  montant numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_facture_paiements_facture_id ON public.facture_paiements(facture_id);

ALTER TABLE public.facture_paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage facture_paiements"
ON public.facture_paiements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_facture_paiements_updated_at
BEFORE UPDATE ON public.facture_paiements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
