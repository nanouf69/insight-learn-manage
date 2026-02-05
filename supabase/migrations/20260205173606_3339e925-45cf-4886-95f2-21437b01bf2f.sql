-- Ajouter les champs de paiement à la table apprenants
ALTER TABLE public.apprenants 
ADD COLUMN IF NOT EXISTS montant_paye NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS moyen_paiement TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;