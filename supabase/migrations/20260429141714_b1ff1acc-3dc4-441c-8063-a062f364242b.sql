ALTER TABLE public.apprenants
  ADD COLUMN IF NOT EXISTS societe_nom TEXT,
  ADD COLUMN IF NOT EXISTS societe_siret TEXT,
  ADD COLUMN IF NOT EXISTS societe_tva_intra TEXT,
  ADD COLUMN IF NOT EXISTS societe_adresse TEXT,
  ADD COLUMN IF NOT EXISTS societe_code_postal TEXT,
  ADD COLUMN IF NOT EXISTS societe_ville TEXT,
  ADD COLUMN IF NOT EXISTS facture_contact_nom TEXT,
  ADD COLUMN IF NOT EXISTS facture_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS facture_contact_telephone TEXT;