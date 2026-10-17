ALTER TABLE public.devis_envois
  ADD COLUMN IF NOT EXISTS contrat_conditions jsonb,
  ADD COLUMN IF NOT EXISTS consentements jsonb,
  ADD COLUMN IF NOT EXISTS retractation jsonb;
COMMENT ON COLUMN public.devis_envois.contrat_conditions IS 'Snapshot figé du devis valant contrat (version, contrat, pratique, validation). Immuable une fois renseigné.';
COMMENT ON COLUMN public.devis_envois.consentements IS 'Cases facultatives de signature (texte exact, version, horodatage serveur). Écrites une seule fois par le serveur.';
COMMENT ON COLUMN public.devis_envois.retractation IS 'Rétractation en ligne horodatée par le serveur. Écrite une seule fois.';

CREATE OR REPLACE FUNCTION public.garde_devis_valant_contrat()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.contrat_conditions IS NOT NULL AND NEW.contrat_conditions IS DISTINCT FROM OLD.contrat_conditions THEN
    RAISE EXCEPTION 'Devis valant contrat : version figée non modifiable' USING ERRCODE = 'P0540';
  END IF;
  IF OLD.consentements IS NOT NULL AND NEW.consentements IS DISTINCT FROM OLD.consentements THEN
    RAISE EXCEPTION 'Consentements de signature non modifiables' USING ERRCODE = 'P0540';
  END IF;
  IF OLD.retractation IS NOT NULL AND NEW.retractation IS DISTINCT FROM OLD.retractation THEN
    RAISE EXCEPTION 'Rétractation enregistrée non modifiable' USING ERRCODE = 'P0540';
  END IF;
  IF OLD.contrat_conditions IS NOT NULL AND OLD.signed_at IS NOT NULL AND (
       NEW.signed_at IS DISTINCT FROM OLD.signed_at
    OR NEW.devis_signe_url IS DISTINCT FROM OLD.devis_signe_url
    OR NEW.token IS DISTINCT FROM OLD.token
    OR (NEW.statut IS DISTINCT FROM OLD.statut AND NOT (NEW.statut = 'retracte' AND NEW.retractation IS NOT NULL))
  ) THEN
    RAISE EXCEPTION 'Devis valant contrat signé : signature et version figées' USING ERRCODE = 'P0540';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_garde_devis_valant_contrat ON public.devis_envois;
CREATE TRIGGER trg_garde_devis_valant_contrat BEFORE UPDATE ON public.devis_envois
FOR EACH ROW EXECUTE FUNCTION public.garde_devis_valant_contrat();

CREATE OR REPLACE FUNCTION public.garde_devis_valant_contrat_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.contrat_conditions IS NOT NULL THEN
    RAISE EXCEPTION 'Devis valant contrat : suppression interdite' USING ERRCODE = 'P0540';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_garde_devis_valant_contrat_delete ON public.devis_envois;
CREATE TRIGGER trg_garde_devis_valant_contrat_delete BEFORE DELETE ON public.devis_envois
FOR EACH ROW EXECUTE FUNCTION public.garde_devis_valant_contrat_delete();