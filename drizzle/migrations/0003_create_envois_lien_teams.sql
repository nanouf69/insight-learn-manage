CREATE TABLE public.envois_lien_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  lien TEXT NOT NULL,
  destinataires JSONB NOT NULL DEFAULT '[]'::jsonb,
  nb_succes INTEGER NOT NULL DEFAULT 0,
  nb_echecs INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.envois_lien_teams TO authenticated;
GRANT ALL ON public.envois_lien_teams TO service_role;

ALTER TABLE public.envois_lien_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read teams link sends"
ON public.envois_lien_teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert teams link sends"
ON public.envois_lien_teams FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_envois_lien_teams_session ON public.envois_lien_teams (session_id, created_at DESC);