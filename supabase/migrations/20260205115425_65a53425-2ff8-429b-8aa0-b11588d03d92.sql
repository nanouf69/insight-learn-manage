-- Ajouter une contrainte d'unicité sur nom + prénom pour éviter les doublons
ALTER TABLE public.apprenants 
ADD CONSTRAINT apprenants_nom_prenom_unique UNIQUE (nom, prenom);