-- Ajouter les colonnes manquantes pour stocker toutes les données du formulaire
ALTER TABLE public.apprenants 
ADD COLUMN IF NOT EXISTS formation_choisie TEXT,
ADD COLUMN IF NOT EXISTS montant_ttc NUMERIC,
ADD COLUMN IF NOT EXISTS date_debut_formation DATE,
ADD COLUMN IF NOT EXISTS date_fin_formation DATE,
ADD COLUMN IF NOT EXISTS creneau_horaire TEXT,
ADD COLUMN IF NOT EXISTS date_examen_theorique TEXT;