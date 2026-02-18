-- Ajouter formateur_id aux fournisseurs pour lier un formateur à son portail
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS formateur_id uuid REFERENCES public.formateurs(id);
