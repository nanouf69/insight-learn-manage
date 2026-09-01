CREATE OR REPLACE FUNCTION public.protect_reponses_apprenants_terminal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.completed = true AND NEW.status <> 'submitted' THEN
      NEW.status := 'submitted';
    END IF;
    IF NEW.status = 'submitted' THEN
      NEW.completed := true;
      NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    END IF;
    RETURN NEW;
  END IF;

  -- Nouvelle tentative explicitement demandée : archiver puis repartir à zéro
  IF COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative THEN
    IF OLD.status = 'submitted' THEN
      INSERT INTO public.reponses_apprenants_historique (
        apprenant_id, user_id, exercice_id, exercice_type, tentative,
        reponses, score, bonnes_reponses, total_questions, status, submitted_at
      ) VALUES (
        OLD.apprenant_id, OLD.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
        OLD.reponses, OLD.score, OLD.bonnes_reponses, OLD.total_questions, OLD.status, OLD.submitted_at
      );
    END IF;
    NEW.status := 'in_progress';
    NEW.completed := false;
    NEW.submitted_at := NULL;
    NEW.score := NULL;
    NEW.bonnes_reponses := NULL;
    NEW.total_questions := NULL;
    NEW.reponses := '{}'::jsonb;
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' THEN
    NEW.status := 'submitted';
    NEW.completed := true;
    NEW.submitted_at := COALESCE(NEW.submitted_at, OLD.submitted_at, now());
    NEW.score := COALESCE(NEW.score, OLD.score);
    NEW.bonnes_reponses := COALESCE(NEW.bonnes_reponses, OLD.bonnes_reponses);
    NEW.total_questions := COALESCE(NEW.total_questions, OLD.total_questions);
    NEW.tentative := GREATEST(COALESCE(NEW.tentative, 1), OLD.tentative);
    IF NEW.reponses IS NULL OR NEW.reponses = '{}'::jsonb THEN
      NEW.reponses := OLD.reponses;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.completed = true AND NEW.status <> 'submitted' THEN
    NEW.status := 'submitted';
  END IF;
  IF NEW.status = 'submitted' THEN
    NEW.completed := true;
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;
  NEW.tentative := GREATEST(COALESCE(NEW.tentative, 1), OLD.tentative);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_quiz_attempt(
  _apprenant_id uuid,
  _exercice_id text
)
RETURNS public.reponses_apprenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.reponses_apprenants;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.reponses_apprenants
  SET tentative = tentative + 1,
      updated_at = now()
  WHERE apprenant_id = _apprenant_id AND exercice_id = _exercice_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_quiz_attempt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_quiz_attempt(uuid, text) TO authenticated, service_role;