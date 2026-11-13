CREATE TABLE public.resend_webhook_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  webhook_id text NOT NULL,
  signing_secret text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.resend_webhook_config FROM anon, authenticated;
GRANT ALL ON public.resend_webhook_config TO service_role;
ALTER TABLE public.resend_webhook_config ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.resend_webhook_config IS 'Clé de signature des avis Resend ; lisible uniquement par les fonctions serveur (aucune politique client).';