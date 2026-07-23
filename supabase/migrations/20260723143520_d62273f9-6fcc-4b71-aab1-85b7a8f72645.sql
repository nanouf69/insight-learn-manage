ALTER TABLE public.devis_envois
  ADD COLUMN IF NOT EXISTS dates_formation TEXT,
  ADD COLUMN IF NOT EXISTS date_devis DATE,
  ADD COLUMN IF NOT EXISTS date_validite DATE;