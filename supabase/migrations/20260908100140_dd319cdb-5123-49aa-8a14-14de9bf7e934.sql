CREATE TABLE public.email_accuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID,
  destinataire TEXT NOT NULL,
  sujet TEXT,
  provider_message_id TEXT,
  statut TEXT NOT NULL DEFAULT 'envoye',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  failed_at TIMESTAMPTZ,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_accuses_apprenant ON public.email_accuses (apprenant_id);
CREATE INDEX idx_email_accuses_destinataire ON public.email_accuses (lower(destinataire));
CREATE INDEX idx_email_accuses_sent_at ON public.email_accuses (sent_at DESC);
CREATE INDEX idx_email_accuses_provider ON public.email_accuses (provider_message_id);

GRANT SELECT ON public.email_accuses TO authenticated;
GRANT ALL ON public.email_accuses TO service_role;

ALTER TABLE public.email_accuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select email_accuses"
ON public.email_accuses FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_accuses_updated_at
BEFORE UPDATE ON public.email_accuses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();