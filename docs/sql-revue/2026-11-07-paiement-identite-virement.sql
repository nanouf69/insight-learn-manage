-- Ajout technique sans backfill : les paiements existants restent strictement inchangés.
-- L'identifiant bancaire sera enregistré uniquement lors d'un nouvel ajout explicite depuis un virement affiché.
ALTER TABLE public.apprenant_paiements
  ADD COLUMN IF NOT EXISTS transaction_bancaire_id uuid NULL REFERENCES public.transactions_bancaires(id);

CREATE UNIQUE INDEX IF NOT EXISTS apprenant_paiements_transaction_bancaire_unique
  ON public.apprenant_paiements (transaction_bancaire_id)
  WHERE transaction_bancaire_id IS NOT NULL;

COMMENT ON COLUMN public.apprenant_paiements.transaction_bancaire_id IS
  'Liaison explicite et unique au virement sélectionné ; aucune déduction par date/montant et aucun rapprochement historique automatique.';
