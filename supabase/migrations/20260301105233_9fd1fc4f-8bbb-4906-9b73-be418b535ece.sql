
-- Add online course access dates and authorized modules
ALTER TABLE public.apprenants
ADD COLUMN IF NOT EXISTS date_debut_cours_en_ligne date,
ADD COLUMN IF NOT EXISTS date_fin_cours_en_ligne date,
ADD COLUMN IF NOT EXISTS modules_autorises integer[];
