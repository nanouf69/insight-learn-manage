-- Filet de sécurité « matière terminée sans note » : il ne doit JAMAIS créer
-- une ligne de résultat à 0. Une sauvegarde en attente n'est pas une note.
-- On enregistre désormais une alerte système (avec les réponses brutes) au lieu
-- d'insérer un résultat artificiel. Les réponses restent dans
-- reponses_apprenants et remontent normalement en correction QRC.
CREATE OR REPLACE FUNCTION public.ensure_quiz_result_on_matiere_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_quiz_id text;
  v_matiere_raw text;
  v_matiere text;
  v_tentative integer := 1;
  v_exists boolean;
  v_apprenant_exists boolean;
  m text[];
  t text[];
BEGIN
  IF NEW.exercice_type IS DISTINCT FROM 'examen_blanc' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.completed, false) <> true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.completed, false) = true THEN
    RETURN NEW;
  END IF;

  m := regexp_match(NEW.exercice_id, '^((?:EB|eb)\d+(?:-[a-zA-Z0-9]+)?|bilan-[^_]+)_+(.+)$');
  IF m IS NULL THEN
    INSERT INTO public.alertes_systeme (type, titre, message, details)
    VALUES (
      'exam_result_missing',
      'Format exercice_id inconnu (examen blanc)',
      'Impossible de rattacher la matière terminée pour exercice_id=' || NEW.exercice_id,
      jsonb_build_object(
        'apprenant_id', NEW.apprenant_id,
        'exercice_id', NEW.exercice_id,
        'user_id', NEW.user_id
      )::text
    );
    RETURN NEW;
  END IF;

  v_quiz_id := m[1];
  v_matiere_raw := m[2];

  t := regexp_match(v_matiere_raw, '^(.+?)_+t(\d+)$');
  IF t IS NOT NULL THEN
    v_matiere := t[1];
    v_tentative := GREATEST(1, t[2]::integer);
  ELSE
    v_matiere := v_matiere_raw;
    v_tentative := 1;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.apprenants WHERE id = NEW.apprenant_id) INTO v_apprenant_exists;
  IF NOT v_apprenant_exists THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.apprenant_quiz_results
    WHERE apprenant_id = NEW.apprenant_id
      AND quiz_id = v_quiz_id
      AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
  ) INTO v_exists;

  IF v_exists THEN
    -- Une note existe déjà : on ne touche ni au score, ni aux corrections.
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = (
         SELECT MAX(tentative) FROM public.apprenant_quiz_results
         WHERE apprenant_id = NEW.apprenant_id
           AND quiz_id = v_quiz_id
           AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       );
    RETURN NEW;
  END IF;

  -- Aucune note écrite : on signale, on ne crée AUCUN résultat à 0.
  INSERT INTO public.alertes_systeme (type, titre, message, details)
  VALUES (
    'exam_result_missing',
    'Matière terminée sans note enregistrée (finalisation en attente)',
    'Les réponses sont conservées pour ' || NEW.exercice_id || ' : la note doit être recalculée, aucun 0 n''a été enregistré.',
    jsonb_build_object(
      'apprenant_id', NEW.apprenant_id,
      'user_id', NEW.user_id,
      'quiz_id', v_quiz_id,
      'matiere_id', v_matiere,
      'tentative', v_tentative,
      'exercice_id', NEW.exercice_id,
      'raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
    )::text
  );

  RETURN NEW;
END;
$function$;