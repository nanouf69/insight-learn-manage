-- Le délai de 48 h ne doit s'appliquer qu'au démarrage d'une NOUVELLE tentative
-- d'un examen blanc dont la tentative précédente est réellement terminée
-- (toutes les matières finalisées). Il ne doit jamais bloquer le passage
-- d'une matière à une autre, la sauvegarde ou la reprise d'une tentative ouverte.
CREATE OR REPLACE FUNCTION public.enforce_exam_retake_delay()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exam text;
  v_tent integer;
  v_already_started boolean;
  v_last timestamptz;
  v_auth uuid;
  v_total_matieres integer;
  v_matieres_prec integer;
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

  IF v_tent <= 1 THEN
    RETURN NEW;
  END IF;

  -- Tentative déjà ouverte (une autre matière du même passage existe) : jamais bloquée
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

  -- Nombre de matières que comporte cet examen (observé en base, lecture seule)
  SELECT COUNT(DISTINCT split_part(COALESCE(r.exercice_id, ''), '__', 2))
    INTO v_total_matieres
  FROM public.reponses_apprenants r
  WHERE r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND split_part(COALESCE(r.exercice_id, ''), '__', 2) <> '';

  -- Matières réellement finalisées par l'apprenant sur les tentatives précédentes
  SELECT COUNT(DISTINCT split_part(COALESCE(r.exercice_id, ''), '__', 2))
    INTO v_matieres_prec
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE
    AND split_part(COALESCE(r.exercice_id, ''), '__', 2) <> '';

  -- Tentative précédente incomplète : l'apprenant est encore dans son passage, aucun délai
  IF COALESCE(v_total_matieres, 0) = 0
     OR COALESCE(v_matieres_prec, 0) < v_total_matieres THEN
    RETURN NEW;
  END IF;

  SELECT MAX(COALESCE(r.submitted_at, r.updated_at, r.created_at))
    INTO v_last
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE;

  IF v_last IS NOT NULL AND now() < v_last + interval '48 hours' THEN
    SELECT a.id INTO v_auth
    FROM public.exam_retake_authorizations a
    WHERE a.apprenant_id = NEW.apprenant_id
      AND a.exam_id = v_exam
      AND a.consumed_at IS NULL
      AND a.revoked_at IS NULL
    ORDER BY a.created_at ASC
    LIMIT 1;

    IF v_auth IS NOT NULL THEN
      UPDATE public.exam_retake_authorizations
         SET consumed_at = now()
       WHERE id = v_auth;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'EXAM_RETAKE_DELAY_48H: nouvelle tentative possible le %',
      to_char((v_last + interval '48 hours') AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY HH24"h"MI')
      USING ERRCODE = 'P0471';
  END IF;

  RETURN NEW;
END;
$function$;