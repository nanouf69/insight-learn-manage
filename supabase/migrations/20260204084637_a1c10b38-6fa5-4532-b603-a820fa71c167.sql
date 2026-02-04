-- Add billing/invoicing columns to formateurs table
ALTER TABLE public.formateurs
ADD COLUMN IF NOT EXISTS adresse text,
ADD COLUMN IF NOT EXISTS code_postal text,
ADD COLUMN IF NOT EXISTS ville text,
ADD COLUMN IF NOT EXISTS societe_nom text,
ADD COLUMN IF NOT EXISTS siren text,
ADD COLUMN IF NOT EXISTS numero_tva text;