CREATE OR REPLACE FUNCTION public.protect_nonzero_quiz_score_on_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.score_obtenu, 0) > 0
     AND COALESCE(NEW.score_obtenu, 0) <= 0 THEN
    NEW.score_obtenu := OLD.score_obtenu;

    IF COALESCE(NEW.score_max, 0) > 0 THEN
      NEW.note_sur_20 := ROUND(((NEW.score_obtenu / NEW.score_max) * 20)::numeric, 1);
    ELSE
      NEW.note_sur_20 := COALESCE(OLD.note_sur_20, NEW.note_sur_20);
    END IF;

    NEW.reussi := COALESCE(OLD.reussi, NEW.reussi);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_nonzero_quiz_score_on_update ON public.apprenant_quiz_results;

CREATE TRIGGER trg_protect_nonzero_quiz_score_on_update
BEFORE UPDATE ON public.apprenant_quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.protect_nonzero_quiz_score_on_update();