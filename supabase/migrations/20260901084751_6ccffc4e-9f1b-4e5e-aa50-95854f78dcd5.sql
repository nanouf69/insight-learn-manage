-- 1. Colonnes de statut
ALTER TABLE public.reponses_apprenants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tentative integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bonnes_reponses integer,
  ADD COLUMN IF NOT EXISTS total_questions integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reponses_apprenants_status_check'
  ) THEN
    ALTER TABLE public.reponses_apprenants
      ADD CONSTRAINT reponses_apprenants_status_check
      CHECK (status IN ('in_progress', 'submitted'));
  END IF;
END $$;

-- Backfill : les lignes déjà "completed" sont des tentatives soumises
UPDATE public.reponses_apprenants
SET status = 'submitted',
    submitted_at = COALESCE(submitted_at, updated_at)
WHERE completed = true AND status <> 'submitted';

-- 2. Historique des tentatives
CREATE TABLE IF NOT EXISTS public.reponses_apprenants_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  user_id uuid,
  exercice_id text NOT NULL,
  exercice_type text NOT NULL,
  tentative integer NOT NULL DEFAULT 1,
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  bonnes_reponses integer,
  total_questions integer,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reponses_apprenants_historique TO authenticated;
GRANT ALL ON public.reponses_apprenants_historique TO service_role;

ALTER TABLE public.reponses_apprenants_historique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learner can read own historique" ON public.reponses_apprenants_historique;
CREATE POLICY "Learner can read own historique"
ON public.reponses_apprenants_historique
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = reponses_apprenants_historique.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_rah_apprenant_exercice
  ON public.reponses_apprenants_historique (apprenant_id, exercice_id);

-- 3. Trigger de protection : un autosave ne peut jamais dévalider une tentative
CREATE OR REPLACE FUNCTION public.protect_reponses_apprenants_terminal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cohérence statut <-> completed
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

  -- UPDATE
  IF OLD.status = 'submitted' AND COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative THEN
    -- Nouvelle tentative demandée : archiver l'ancienne, repartir proprement
    INSERT INTO public.reponses_apprenants_historique (
      apprenant_id, user_id, exercice_id, exercice_type, tentative,
      reponses, score, bonnes_reponses, total_questions, status, submitted_at
    ) VALUES (
      OLD.apprenant_id, OLD.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
      OLD.reponses, OLD.score, OLD.bonnes_reponses, OLD.total_questions, OLD.status, OLD.submitted_at
    );
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' THEN
    -- Jamais de retour arrière sur une tentative validée
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

DROP TRIGGER IF EXISTS trg_protect_reponses_apprenants_terminal ON public.reponses_apprenants;
CREATE TRIGGER trg_protect_reponses_apprenants_terminal
BEFORE INSERT OR UPDATE ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.protect_reponses_apprenants_terminal();

-- 4. RPC de validation définitive d'une tentative
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _apprenant_id uuid,
  _exercice_id text,
  _exercice_type text,
  _reponses jsonb,
  _score numeric DEFAULT NULL,
  _bonnes_reponses integer DEFAULT NULL,
  _total_questions integer DEFAULT NULL
)
RETURNS public.reponses_apprenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.reponses_apprenants;
  _is_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) INTO _is_owner;

  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.reponses_apprenants AS r (
    apprenant_id, user_id, exercice_id, exercice_type,
    reponses, score, bonnes_reponses, total_questions,
    completed, status, submitted_at, updated_at
  ) VALUES (
    _apprenant_id, COALESCE(auth.uid(), _apprenant_id), _exercice_id, _exercice_type,
    COALESCE(_reponses, '{}'::jsonb), _score, _bonnes_reponses, _total_questions,
    true, 'submitted', now(), now()
  )
  ON CONFLICT (apprenant_id, exercice_id) DO UPDATE SET
    exercice_type = EXCLUDED.exercice_type,
    reponses = CASE WHEN EXCLUDED.reponses = '{}'::jsonb THEN r.reponses ELSE EXCLUDED.reponses END,
    score = COALESCE(EXCLUDED.score, r.score),
    bonnes_reponses = COALESCE(EXCLUDED.bonnes_reponses, r.bonnes_reponses),
    total_questions = COALESCE(EXCLUDED.total_questions, r.total_questions),
    completed = true,
    status = 'submitted',
    submitted_at = COALESCE(r.submitted_at, now()),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, text, text, jsonb, numeric, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, text, text, jsonb, numeric, integer, integer) TO authenticated, service_role;

-- 5. RPC de réinitialisation (admin) : nouvelle tentative propre + archivage
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
  SET tentative = tentative + 1
  WHERE apprenant_id = _apprenant_id AND exercice_id = _exercice_id;

  UPDATE public.reponses_apprenants
  SET status = 'in_progress',
      completed = false,
      submitted_at = NULL,
      score = NULL,
      bonnes_reponses = NULL,
      total_questions = NULL,
      reponses = '{}'::jsonb,
      updated_at = now()
  WHERE apprenant_id = _apprenant_id AND exercice_id = _exercice_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_quiz_attempt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_quiz_attempt(uuid, text) TO authenticated, service_role;