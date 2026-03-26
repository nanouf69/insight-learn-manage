
CREATE TABLE public.fournisseur_paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL REFERENCES public.fournisseur_factures(id) ON DELETE CASCADE,
  montant numeric NOT NULL DEFAULT 0,
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  moyen_paiement text NOT NULL DEFAULT 'Virement',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseur_paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fournisseur_paiements"
  ON public.fournisseur_paiements FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can select fournisseur_paiements"
  ON public.fournisseur_paiements FOR SELECT
  TO public
  USING (true);
