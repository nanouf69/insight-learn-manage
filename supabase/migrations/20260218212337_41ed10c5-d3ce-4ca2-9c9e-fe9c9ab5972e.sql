-- Contrainte d'unicité sur formateurs (nom + prénom normalisés)
CREATE UNIQUE INDEX IF NOT EXISTS formateurs_nom_prenom_unique 
ON public.formateurs (LOWER(TRIM(nom)), LOWER(TRIM(prenom)));