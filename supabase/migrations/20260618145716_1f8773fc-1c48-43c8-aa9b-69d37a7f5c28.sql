ALTER TABLE public.apprenants
  ADD COLUMN IF NOT EXISTS heures_elearning numeric,
  ADD COLUMN IF NOT EXISTS heures_presentiel numeric,
  ADD COLUMN IF NOT EXISTS heures_totales numeric;