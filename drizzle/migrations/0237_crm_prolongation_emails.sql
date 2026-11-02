CREATE TABLE public.crm_prolongation_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id uuid NOT NULL REFERENCES public.crm_acces_extensions(id),
  apprenant_id uuid NOT NULL,
  destinataire text,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','envoye','echec')),
  erreur text,
  email_id uuid,
  auteur uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  termine_at timestamptz
);
GRANT SELECT ON public.crm_prolongation_emails TO authenticated;
GRANT ALL ON public.crm_prolongation_emails TO service_role;
ALTER TABLE public.crm_prolongation_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les envois de prolongation" ON public.crm_prolongation_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
-- Un seul envoi en cours ou réussi par prolongation : empêche double envoi.
CREATE UNIQUE INDEX crm_prolongation_emails_un_actif ON public.crm_prolongation_emails(extension_id) WHERE statut IN ('en_cours','envoye');
CREATE INDEX crm_prolongation_emails_apprenant ON public.crm_prolongation_emails(apprenant_id, created_at DESC);