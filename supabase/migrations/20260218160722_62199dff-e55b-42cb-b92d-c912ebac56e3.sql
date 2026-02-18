
-- Ajouter une colonne presence_pratique dans session_apprenants
-- Valeurs possibles : NULL (non renseigné), 'present', 'absent', 'deplace'
ALTER TABLE public.session_apprenants
ADD COLUMN IF NOT EXISTS presence_pratique text DEFAULT NULL;
