
-- Ajout des colonnes bancaires et professionnelles aux fournisseurs
ALTER TABLE public.fournisseurs
  ADD COLUMN IF NOT EXISTS siren text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS numero_tva text,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bic text,
  ADD COLUMN IF NOT EXISTS banque text,
  ADD COLUMN IF NOT EXISTS pays text DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS site_web text,
  ADD COLUMN IF NOT EXISTS code_postal text,
  ADD COLUMN IF NOT EXISTS ville text;

-- Ajout des colonnes bancaires aux formateurs
ALTER TABLE public.formateurs
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bic text,
  ADD COLUMN IF NOT EXISTS banque text,
  ADD COLUMN IF NOT EXISTS site_web text;
