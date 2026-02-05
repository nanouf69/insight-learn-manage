-- Ajouter la colonne type_apprenant à la table apprenants
ALTER TABLE public.apprenants 
ADD COLUMN type_apprenant text DEFAULT NULL;

-- Commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN public.apprenants.type_apprenant IS 'Type d''apprenant: vtc, taxi, ta (passerelle taxi), va (passerelle vtc)';