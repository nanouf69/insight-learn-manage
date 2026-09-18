ALTER TABLE public.devis_envois
  ALTER COLUMN apprenant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organismes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_nom text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_adresse text,
  ADD COLUMN IF NOT EXISTS client_code_postal text,
  ADD COLUMN IF NOT EXISTS client_ville text,
  ADD COLUMN IF NOT EXISTS client_telephone text;

CREATE OR REPLACE FUNCTION public.protect_devis_envois_public_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.id                 IS DISTINCT FROM OLD.id
     OR NEW.token           IS DISTINCT FROM OLD.token
     OR NEW.apprenant_id    IS DISTINCT FROM OLD.apprenant_id
     OR NEW.organisation_id IS DISTINCT FROM OLD.organisation_id
     OR NEW.client_nom      IS DISTINCT FROM OLD.client_nom
     OR NEW.client_email    IS DISTINCT FROM OLD.client_email
     OR NEW.client_adresse  IS DISTINCT FROM OLD.client_adresse
     OR NEW.client_code_postal IS DISTINCT FROM OLD.client_code_postal
     OR NEW.client_ville    IS DISTINCT FROM OLD.client_ville
     OR NEW.client_telephone IS DISTINCT FROM OLD.client_telephone
     OR NEW.modele          IS DISTINCT FROM OLD.modele
     OR NEW.montant         IS DISTINCT FROM OLD.montant
     OR NEW.formation       IS DISTINCT FROM OLD.formation
     OR NEW.fichier_url     IS DISTINCT FROM OLD.fichier_url
     OR NEW.dates_formation IS DISTINCT FROM OLD.dates_formation
     OR NEW.date_devis      IS DISTINCT FROM OLD.date_devis
     OR NEW.date_validite   IS DISTINCT FROM OLD.date_validite
     OR NEW.created_at      IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'devis_envois: seules les colonnes de signature peuvent être modifiées publiquement';
  END IF;

  RETURN NEW;
END;
$$;