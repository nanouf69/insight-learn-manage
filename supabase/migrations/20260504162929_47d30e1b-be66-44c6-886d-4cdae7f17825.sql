ALTER TABLE public.transactions_bancaires
  ADD COLUMN IF NOT EXISTS montant_ht numeric,
  ADD COLUMN IF NOT EXISTS montant_tva numeric;