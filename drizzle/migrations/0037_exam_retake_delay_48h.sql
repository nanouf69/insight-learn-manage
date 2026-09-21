-- DÉLAI DE 48 H AVANT UNE NOUVELLE TENTATIVE D'EXAMEN BLANC (serveur).
-- Portée : exercice_type = 'examen_blanc' UNIQUEMENT (VTC, TAXI, VA, TA).
-- Le e-learning (quiz, exercices, bilans, révisions) n'est jamais concerné.
-- Une tentative en cours reste reprenable : seul le PREMIER enregistrement
-- d'une nouvelle tentative est contrôlé. Aucune donnée existante n'est
-- modifiée, supprimée ni recalculée.

CREATE OR REPLACE FUNCTION public.enforce_exam_retake_delay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam text;
  v_tent integer;
  v_already_started boolean;
  v_last timestamptz;
BEGIN
  IF COALESCE(NEW.exercice_type, '') <> 'examen_blanc' THEN
    RETURN NEW;
  END IF;

  v_exam := split_part(COALESCE(NEW.exercice_id, ''), '__', 1);
  IF v_exam = '' THEN
    RETURN NEW;
  END IF;

  v_tent := GREATEST(
    COALESCE(NULLIF(substring(COALESCE(NEW.exercice_id, '') FROM '_t([0-9]+)$'), '')::int, 1),
    COALESCE(NEW.tentative, 1)
  );

  -- Première tentative : jamais bloquée.
  IF v_tent <= 1 THEN
    RETURN NEW;
  END IF;

  -- Tentative déjà commencée (autre matière du même passage) : reprise libre.
  SELECT EXISTS (
    SELECT 1 FROM public.reponses_apprenants r
    WHERE r.apprenant_id = NEW.apprenant_id
      AND r.exercice_type = 'examen_blanc'
      AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
      AND GREATEST(
            COALESCE(NULLIF(substring(COALESCE(r.exercice_id, '') FROM '_t([0-9]+)$'), '')::int, 1),
            COALESCE(r.tentative, 1)
          ) >= v_tent
  ) INTO v_already_started;

  IF v_already_started THEN
    RETURN NEW;
  END IF;

  -- Fin de la dernière tentative réellement terminée (ou en attente de QRC).
  SELECT MAX(COALESCE(r.submitted_at, r.updated_at, r.created_at))
    INTO v_last
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE;

  IF v_last IS NOT NULL AND now() < v_last + interval '48 hours' THEN
    RAISE EXCEPTION 'EXAM_RETAKE_DELAY_48H: nouvelle tentative possible le %',
      to_char((v_last + interval '48 hours') AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY HH24"h"MI')
      USING ERRCODE = 'P0471';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_exam_retake_delay ON public.reponses_apprenants;
CREATE TRIGGER trg_enforce_exam_retake_delay
BEFORE INSERT ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.enforce_exam_retake_delay();