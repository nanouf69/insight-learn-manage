CREATE TABLE IF NOT EXISTS public.onboarding_search_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_search_rate_limit_ip
  ON public.onboarding_search_rate_limit (ip_hash, window_start DESC);

GRANT ALL ON public.onboarding_search_rate_limit TO service_role;

ALTER TABLE public.onboarding_search_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view onboarding search rate limit"
ON public.onboarding_search_rate_limit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));