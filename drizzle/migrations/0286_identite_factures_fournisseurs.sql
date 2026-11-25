ALTER TABLE public.fournisseur_factures
  ADD COLUMN IF NOT EXISTS numero_facture text,
  ADD COLUMN IF NOT EXISTS date_facture date;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fournisseur_facture_identite
  ON public.fournisseur_factures (fournisseur_id, numero_facture, date_facture, montant)
  WHERE numero_facture IS NOT NULL AND date_facture IS NOT NULL AND montant IS NOT NULL;

COMMENT ON COLUMN public.fournisseur_factures.numero_facture IS 'Numéro exact de la facture fournisseur, distinct du nom du fichier.';
COMMENT ON COLUMN public.fournisseur_factures.date_facture IS 'Date réelle de la facture fournisseur ; created_at reste la date technique d’enregistrement.';