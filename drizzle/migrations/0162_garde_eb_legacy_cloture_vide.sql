-- Garde additive : aucune NOUVELLE clôture vide d'examen blanc legacy.
-- Aucun UPDATE/DELETE de données ; lignes déjà terminées non concernées.
CREATE OR REPLACE FUNCTION public.eb_reponses_renseignees(_r jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    jsonb_typeof(_r) = 'object'
    AND jsonb_path_exists(
      _r,
      'strict $.** ? ((@.type() == "string" && @ like_regex "\\S") || @.type() == "number" || @.type() == "boolean")'
    ),
    false)
$$;

CREATE OR REPLACE FUNCTION public.garde_eb_legacy_cloture_vide()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_terminal boolean := (COALESCE(NEW.completed, false) OR NEW.status = 'submitted');
BEGIN
  -- Portée exacte : examens blancs legacy (le nouveau moteur n'écrit pas ici).
  IF NEW.exercice_type IS DISTINCT FROM 'examen_blanc' OR NEW.source_noyau IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NOT v_terminal OR public.eb_reponses_renseignees(NEW.reponses) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Ligne déjà terminée (historique) : jamais bloquée ici.
    IF COALESCE(OLD.completed, false) OR OLD.status = 'submitted' THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Clôture refusée : examen blanc % sans aucune réponse enregistrée. Rechargez normalement la page et attendez le chargement de vos réponses ; aucune donnée n''est supprimée.', NEW.exercice_id
    USING ERRCODE = 'P0530',
          HINT = 'EB_CLOTURE_VIDE_REFUSEE';
END;
$$;

DROP TRIGGER IF EXISTS trg_zy_garde_eb_legacy_cloture_vide ON public.reponses_apprenants;
CREATE TRIGGER trg_zy_garde_eb_legacy_cloture_vide
BEFORE INSERT OR UPDATE ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.garde_eb_legacy_cloture_vide();

COMMENT ON FUNCTION public.garde_eb_legacy_cloture_vide() IS
  'Refuse (P0530) toute nouvelle ligne ou transition non terminale -> terminale vide pour un examen blanc legacy. Sans effet de bord ; historiques terminés non concernés.';