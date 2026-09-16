-- Corrige la cause des « notes fantômes à 0 » : le suffixe de tentative
-- (__t2, __t3 ...) était interprété comme une matière distincte.
-- Aucune donnée existante n'est modifiée ni supprimée par cette migration.
CREATE OR REPLACE FUNCTION public.ensure_quiz_result_on_matiere_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id text;
  v_matiere_raw text;
  v_matiere text;
  v_tentative integer := 1;
  v_quiz_type text;
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
      'Impossible de créer la ligne de note automatiquement pour exercice_id=' || NEW.exercice_id,
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

  -- Sépare la matière réelle du numéro de tentative (« gestion__t3 » -> « gestion », 3)
  t := regexp_match(v_matiere_raw, '^(.+?)_+t(\d+)$');
  IF t IS NOT NULL THEN
    v_matiere := t[1];
    v_tentative := GREATEST(1, t[2]::integer);
  ELSE
    v_matiere := v_matiere_raw;
    v_tentative := 1;
  END IF;

  v_quiz_type := CASE WHEN v_quiz_id LIKE 'bilan-%' THEN 'bilan' ELSE 'examen_blanc' END;

  SELECT EXISTS(SELECT 1 FROM public.apprenants WHERE id = NEW.apprenant_id) INTO v_apprenant_exists;
  IF NOT v_apprenant_exists THEN
    RETURN NEW;
  END IF;

  -- Une ligne existe déjà pour cette matière (toutes tentatives confondues) :
  -- on ne crée jamais de seconde ligne artificielle, on rafraîchit seulement.
  SELECT EXISTS(
    SELECT 1 FROM public.apprenant_quiz_results
    WHERE apprenant_id = NEW.apprenant_id
      AND quiz_id = v_quiz_id
      AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
  ) INTO v_exists;

  IF v_exists THEN
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

  -- Filet de sécurité : aucune ligne n'existe pour cette matière.
  BEGIN
    INSERT INTO public.apprenant_quiz_results (
      apprenant_id, user_id, quiz_type, quiz_id, quiz_titre,
      matiere_id, matiere_nom, score_obtenu, score_max, note_sur_20, reussi,
      details, completed_at, tentative
    ) VALUES (
      NEW.apprenant_id, NEW.user_id, v_quiz_type, v_quiz_id, v_quiz_id,
      v_matiere, v_matiere, 0, 20, 0, false,
      jsonb_build_object(
        'auto_created', true,
        'reason', 'matiere_completion_backfill',
        'source_exercice_id', NEW.exercice_id,
        'source_tentative', v_tentative,
        'raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb),
        'needs_recompute', true,
        'created_by_trigger_at', now()
      ),
      now(),
      v_tentative
    )
    ON CONFLICT (apprenant_id, quiz_id, matiere_id, tentative) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.alertes_systeme (type, titre, message, details)
    VALUES (
      'exam_result_missing',
      'Échec création ligne de note (examen blanc)',
      'Erreur lors de la création automatique de la ligne pour ' || NEW.exercice_id || ': ' || SQLERRM,
      jsonb_build_object(
        'apprenant_id', NEW.apprenant_id,
        'quiz_id', v_quiz_id,
        'matiere_id', v_matiere,
        'exercice_id', NEW.exercice_id
      )::text
    );
  END;

  RETURN NEW;
END;
$$;