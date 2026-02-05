-- Modifier les colonnes date_debut_formation et date_fin_formation en TEXT pour stocker les dates du catalogue
ALTER TABLE public.apprenants 
  ALTER COLUMN date_debut_formation TYPE text USING date_debut_formation::text,
  ALTER COLUMN date_fin_formation TYPE text USING date_fin_formation::text;

-- Ajouter une colonne pour stocker la sélection de date du catalogue
ALTER TABLE public.apprenants 
  ADD COLUMN IF NOT EXISTS date_formation_catalogue text;