CREATE OR REPLACE FUNCTION public.sync_cma_from_dossier_bienvenue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cma text;
BEGIN
  IF NEW.type_document <> 'dossier-bienvenue' THEN
    RETURN NEW;
  END IF;
  v_cma := NULLIF(TRIM(COALESCE(NEW.donnees->>'numero_dossier_cma', '')), '');
  IF v_cma IS NULL OR NEW.apprenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.apprenants
     SET numero_dossier_cma = v_cma
   WHERE id = NEW.apprenant_id
     AND (numero_dossier_cma IS NULL OR numero_dossier_cma = '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cma_from_dossier_bienvenue ON public.apprenant_documents_completes;
CREATE TRIGGER trg_sync_cma_from_dossier_bienvenue
AFTER INSERT OR UPDATE ON public.apprenant_documents_completes
FOR EACH ROW
EXECUTE FUNCTION public.sync_cma_from_dossier_bienvenue();