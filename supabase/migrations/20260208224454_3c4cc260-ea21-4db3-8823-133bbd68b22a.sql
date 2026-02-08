-- Ajouter les colonnes pour les informations d'examen
ALTER TABLE public.apprenants
ADD COLUMN IF NOT EXISTS type_examen text,
ADD COLUMN IF NOT EXISTS lieu_examen text,
ADD COLUMN IF NOT EXISTS b2_vierge boolean DEFAULT false;

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN public.apprenants.type_examen IS 'Type d''examen: vtc_complet, vtc_mobilite, taxi_complet, taxi_mobilite';
COMMENT ON COLUMN public.apprenants.lieu_examen IS 'Lieu de l''examen théorique';
COMMENT ON COLUMN public.apprenants.b2_vierge IS 'Confirmation que le B2 est vierge';