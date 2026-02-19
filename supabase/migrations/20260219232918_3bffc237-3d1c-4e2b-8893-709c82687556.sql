-- Ajouter une colonne comptable_only pour les fournisseurs de type collaborateur comptable
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS comptable_only boolean DEFAULT false;
