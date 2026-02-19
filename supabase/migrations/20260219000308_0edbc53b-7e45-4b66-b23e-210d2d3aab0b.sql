
ALTER TABLE public.fournisseur_factures 
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'en_attente',
  ADD COLUMN IF NOT EXISTS date_paiement date NULL,
  ADD COLUMN IF NOT EXISTS moyen_paiement text NULL;
