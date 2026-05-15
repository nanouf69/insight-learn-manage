-- 1) Add tentative column with default 1
ALTER TABLE public.apprenant_quiz_results
  ADD COLUMN IF NOT EXISTS tentative integer NOT NULL DEFAULT 1;

-- 2) Drop old unique constraint that blocks retakes
ALTER TABLE public.apprenant_quiz_results
  DROP CONSTRAINT IF EXISTS unique_apprenant_quiz_matiere;

-- 3) New unique constraint including tentative
ALTER TABLE public.apprenant_quiz_results
  ADD CONSTRAINT unique_apprenant_quiz_matiere_tentative
  UNIQUE (apprenant_id, quiz_id, matiere_id, tentative);

-- 4) Trigger: auto-compute next tentative on INSERT if not explicitly set (>1 means caller picked)
CREATE OR REPLACE FUNCTION public.set_next_quiz_tentative()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Only auto-assign when tentative is at default (1) AND a row already exists for the same key
  IF NEW.tentative IS NULL OR NEW.tentative = 1 THEN
    SELECT COALESCE(MAX(tentative), 0) + 1 INTO v_next
    FROM public.apprenant_quiz_results
    WHERE apprenant_id = NEW.apprenant_id
      AND quiz_id = NEW.quiz_id
      AND COALESCE(matiere_id, '') = COALESCE(NEW.matiere_id, '');
    IF v_next > 1 THEN
      NEW.tentative := v_next;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_next_quiz_tentative ON public.apprenant_quiz_results;
CREATE TRIGGER trg_set_next_quiz_tentative
  BEFORE INSERT ON public.apprenant_quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_next_quiz_tentative();

-- 5) Helpful index for retake lookups
CREATE INDEX IF NOT EXISTS idx_aqr_apprenant_quiz_matiere
  ON public.apprenant_quiz_results (apprenant_id, quiz_id, matiere_id, tentative DESC);