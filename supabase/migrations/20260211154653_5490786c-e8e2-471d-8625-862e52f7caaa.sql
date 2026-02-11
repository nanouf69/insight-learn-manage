
-- Ajouter le champ inscrit_france_travail à la table apprenants
ALTER TABLE public.apprenants ADD COLUMN inscrit_france_travail boolean DEFAULT false;

-- Ajouter le champ date_examen_pratique pour les formations continues
ALTER TABLE public.apprenants ADD COLUMN date_examen_pratique text;
