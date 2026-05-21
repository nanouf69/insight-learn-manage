
ALTER TABLE public.emargements_fc
  ADD COLUMN IF NOT EXISTS absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS justificatif_url text,
  ADD COLUMN IF NOT EXISTS motif_absence text;

ALTER TABLE public.emargements_fc
  ALTER COLUMN signature_data_url DROP NOT NULL;
