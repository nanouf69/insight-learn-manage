ALTER TABLE public.organismes ADD COLUMN IF NOT EXISTS siret TEXT;
-- Renommer le champ existant n'est pas safe (utilisé comme SIREN). Ajoutons plutôt une colonne dédiée siret_complet
ALTER TABLE public.organismes ADD COLUMN IF NOT EXISTS siret_complet TEXT;