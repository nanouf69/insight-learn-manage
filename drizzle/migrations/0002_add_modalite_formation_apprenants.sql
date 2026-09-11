ALTER TABLE public.apprenants ADD COLUMN IF NOT EXISTS modalite_formation text;
ALTER TABLE public.apprenants DROP CONSTRAINT IF EXISTS apprenants_modalite_formation_check;
ALTER TABLE public.apprenants ADD CONSTRAINT apprenants_modalite_formation_check CHECK (modalite_formation IS NULL OR modalite_formation IN ('presentielle','elearning_synchrone','elearning_asynchrone'));
COMMENT ON COLUMN public.apprenants.modalite_formation IS 'Modalité choisie manuellement : presentielle, elearning_synchrone, elearning_asynchrone';