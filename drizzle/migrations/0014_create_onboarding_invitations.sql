CREATE TABLE public.onboarding_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_by UUID
);

CREATE INDEX idx_onboarding_invitations_apprenant ON public.onboarding_invitations(apprenant_id);

GRANT SELECT, INSERT, UPDATE ON public.onboarding_invitations TO authenticated;
GRANT ALL ON public.onboarding_invitations TO service_role;

ALTER TABLE public.onboarding_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage onboarding_invitations"
ON public.onboarding_invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.onboarding_invite_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'resend',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_invite_rate_limit_ip ON public.onboarding_invite_rate_limit(ip_hash, created_at);

GRANT ALL ON public.onboarding_invite_rate_limit TO service_role;

ALTER TABLE public.onboarding_invite_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read onboarding_invite_rate_limit"
ON public.onboarding_invite_rate_limit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));