-- Additif uniquement : colonnes facultatives pour les FUTURS ajouts. Les lignes existantes restent NULL (non renseigné), jamais réécrites.
ALTER TABLE public.presentiel_heures_validees
  ADD COLUMN IF NOT EXISTS date_presence date NULL,
  ADD COLUMN IF NOT EXISTS categorie text NULL;
ALTER TABLE public.presentiel_heures_validees
  ADD CONSTRAINT presentiel_heures_validees_categorie_chk
  CHECK (categorie IS NULL OR categorie IN ('theorie','pratique','generique'));