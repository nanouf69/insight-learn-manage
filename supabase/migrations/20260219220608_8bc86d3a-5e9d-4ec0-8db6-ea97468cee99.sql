
-- Table pour stocker les transactions bancaires importées
CREATE TABLE public.transactions_bancaires (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_operation date NOT NULL,
  libelle text NOT NULL,
  montant numeric NOT NULL, -- positif = crédit, négatif = débit
  solde numeric NULL,
  banque text NOT NULL DEFAULT 'BNP Paribas',
  reference text NULL,
  -- Rapprochement
  categorie text NULL,
  fournisseur_client text NULL,
  notes text NULL,
  statut text NOT NULL DEFAULT 'non_justifie', -- non_justifie, justifie, ignore
  justificatif_id uuid NULL REFERENCES public.justificatifs(id) ON DELETE SET NULL,
  -- Métadonnées
  source text NOT NULL DEFAULT 'import_csv', -- import_csv, saisie_manuelle, gocardless
  releve_id uuid NULL REFERENCES public.releves_bancaires(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions_bancaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transactions_bancaires"
ON public.transactions_bancaires
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_transactions_bancaires_updated_at
BEFORE UPDATE ON public.transactions_bancaires
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
