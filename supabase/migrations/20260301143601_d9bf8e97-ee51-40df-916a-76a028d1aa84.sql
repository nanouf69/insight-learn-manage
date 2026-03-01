-- Suivi des connexions apprenant
CREATE TABLE IF NOT EXISTS public.apprenant_connexions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'cours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apprenant_connexions_ended_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_apprenant_connexions_apprenant_started
  ON public.apprenant_connexions(apprenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_apprenant_connexions_user_started
  ON public.apprenant_connexions(user_id, started_at DESC);

-- Suivi des actions sur modules
CREATE TABLE IF NOT EXISTS public.apprenant_module_activites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  connexion_id UUID REFERENCES public.apprenant_connexions(id) ON DELETE SET NULL,
  module_id INTEGER NOT NULL,
  module_nom TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'open_module',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apprenant_module_activites_apprenant_occurred
  ON public.apprenant_module_activites(apprenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_apprenant_module_activites_connexion_occurred
  ON public.apprenant_module_activites(connexion_id, occurred_at DESC);

-- Trigger updated_at pour les connexions
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apprenant_connexions_set_updated_at ON public.apprenant_connexions;
CREATE TRIGGER trg_apprenant_connexions_set_updated_at
BEFORE UPDATE ON public.apprenant_connexions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- RLS
ALTER TABLE public.apprenant_connexions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprenant_module_activites ENABLE ROW LEVEL SECURITY;

-- Policies apprenant_connexions
DROP POLICY IF EXISTS "Admins can manage apprenant_connexions" ON public.apprenant_connexions;
DROP POLICY IF EXISTS "Students can insert own apprenant_connexions" ON public.apprenant_connexions;
DROP POLICY IF EXISTS "Students can update own apprenant_connexions" ON public.apprenant_connexions;
DROP POLICY IF EXISTS "Students can select own apprenant_connexions" ON public.apprenant_connexions;

CREATE POLICY "Admins can manage apprenant_connexions"
ON public.apprenant_connexions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can insert own apprenant_connexions"
ON public.apprenant_connexions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Students can update own apprenant_connexions"
ON public.apprenant_connexions
FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = apprenant_id
      AND a.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Students can select own apprenant_connexions"
ON public.apprenant_connexions
FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

-- Policies apprenant_module_activites
DROP POLICY IF EXISTS "Admins can manage apprenant_module_activites" ON public.apprenant_module_activites;
DROP POLICY IF EXISTS "Students can insert own apprenant_module_activites" ON public.apprenant_module_activites;
DROP POLICY IF EXISTS "Students can select own apprenant_module_activites" ON public.apprenant_module_activites;

CREATE POLICY "Admins can manage apprenant_module_activites"
ON public.apprenant_module_activites
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can insert own apprenant_module_activites"
ON public.apprenant_module_activites
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Students can select own apprenant_module_activites"
ON public.apprenant_module_activites
FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);