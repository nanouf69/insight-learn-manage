ALTER TABLE public.apprenants
  ADD COLUMN IF NOT EXISTS abandonnee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_abandon date;