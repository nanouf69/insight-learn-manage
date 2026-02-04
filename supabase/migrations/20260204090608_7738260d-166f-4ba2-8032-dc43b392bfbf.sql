-- Ajouter la colonne civilité à la table apprenants
ALTER TABLE public.apprenants ADD COLUMN IF NOT EXISTS civilite text;

-- Ajouter la colonne civilité à la table formateurs
ALTER TABLE public.formateurs ADD COLUMN IF NOT EXISTS civilite text;