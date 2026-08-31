-- 1) Real state columns
ALTER TABLE public.apprenant_module_completion
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2) Backfill: every existing row was treated as "completed" by the app heuristics
UPDATE public.apprenant_module_completion
SET status = 'completed',
    progress = 100,
    completed_at = COALESCE(completed_at, created_at, now())
WHERE status <> 'completed';

CREATE INDEX IF NOT EXISTS idx_amc_apprenant_status
  ON public.apprenant_module_completion (apprenant_id, status);

-- 3) Terminal-state protection: completed can never be downgraded by client writes
CREATE OR REPLACE FUNCTION public.protect_module_completion_terminal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged BOOLEAN;
BEGIN
  is_privileged := (current_setting('role', true) = 'service_role')
                   OR public.has_role(auth.uid(), 'admin');

  NEW.updated_at := now();

  IF OLD.status = 'completed' THEN
    IF is_privileged AND NEW.status <> 'completed' THEN
      -- deliberate admin/service reset: allowed
      RETURN NEW;
    END IF;

    -- terminal state: freeze validation, never regress
    NEW.status := 'completed';
    NEW.progress := GREATEST(COALESCE(NEW.progress, 0), COALESCE(OLD.progress, 100), 100);
    NEW.completed_at := COALESCE(OLD.completed_at, NEW.completed_at, now());
    IF NEW.score_obtenu IS NULL THEN NEW.score_obtenu := OLD.score_obtenu; END IF;
    IF NEW.score_max IS NULL THEN NEW.score_max := OLD.score_max; END IF;
    IF NEW.details IS NULL
       OR jsonb_typeof(NEW.details) <> 'array'
       OR (jsonb_array_length(NEW.details) = 0 AND COALESCE(jsonb_array_length(OLD.details), 0) > 0)
    THEN
      NEW.details := OLD.details;
    END IF;
    RETURN NEW;
  END IF;

  -- not completed yet: never let progress go backwards
  NEW.progress := GREATEST(COALESCE(NEW.progress, 0), COALESCE(OLD.progress, 0));
  IF NEW.status = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.progress := 100;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_module_completion_terminal ON public.apprenant_module_completion;
CREATE TRIGGER trg_protect_module_completion_terminal
BEFORE UPDATE ON public.apprenant_module_completion
FOR EACH ROW EXECUTE FUNCTION public.protect_module_completion_terminal();

-- 4) Atomic save RPC (single source of truth for client writes)
CREATE OR REPLACE FUNCTION public.save_module_completion(
  _apprenant_id UUID,
  _module_id INTEGER,
  _completed BOOLEAN DEFAULT false,
  _progress INTEGER DEFAULT 0,
  _score_obtenu INTEGER DEFAULT NULL,
  _score_max INTEGER DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS public.apprenant_module_completion
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed BOOLEAN;
  result public.apprenant_module_completion;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role'
  INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not authorized for this apprenant';
  END IF;

  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, score_obtenu, score_max, details)
  VALUES (
    _apprenant_id,
    _module_id,
    CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN _completed THEN 100 ELSE GREATEST(COALESCE(_progress, 0), 0) END,
    CASE WHEN _completed THEN now() ELSE NULL END,
    _score_obtenu,
    _score_max,
    COALESCE(_details, '[]'::jsonb)
  )
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET status = CASE WHEN amc.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
      progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0), CASE WHEN _completed THEN 100 ELSE 0 END),
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at
                          WHEN _completed THEN now() ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE
                  WHEN _details IS NULL THEN amc.details
                  WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                  ELSE _details
                END
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_module_completion(UUID, INTEGER, BOOLEAN, INTEGER, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_module_completion(UUID, INTEGER, BOOLEAN, INTEGER, INTEGER, INTEGER, JSONB) TO authenticated, service_role;