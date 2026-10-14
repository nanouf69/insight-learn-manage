ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS email_accuse_id uuid;
CREATE INDEX IF NOT EXISTS idx_emails_email_accuse_id ON public.emails(email_accuse_id);
COMMENT ON COLUMN public.emails.email_accuse_id IS 'Lien exact vers email_accuses.id (copie du contenu réellement envoyé). Null pour l''historique : jamais de rattachement inventé.';