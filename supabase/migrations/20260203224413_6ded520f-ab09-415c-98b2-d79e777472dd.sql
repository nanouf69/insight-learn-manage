-- Add financing mode to apprenants table
ALTER TABLE public.apprenants 
ADD COLUMN IF NOT EXISTS mode_financement text DEFAULT 'personnel';

-- Add individual dates to session_apprenants junction table
ALTER TABLE public.session_apprenants 
ADD COLUMN IF NOT EXISTS date_debut date,
ADD COLUMN IF NOT EXISTS date_fin date,
ADD COLUMN IF NOT EXISTS mode_financement text DEFAULT 'personnel';

-- Add comment for clarity
COMMENT ON COLUMN public.apprenants.mode_financement IS 'Mode de financement: cpf, personnel, opco, france_travail, autre';
COMMENT ON COLUMN public.session_apprenants.mode_financement IS 'Mode de financement spécifique pour cette session';
COMMENT ON COLUMN public.session_apprenants.date_debut IS 'Date de début personnalisée pour cet apprenant';
COMMENT ON COLUMN public.session_apprenants.date_fin IS 'Date de fin personnalisée pour cet apprenant';