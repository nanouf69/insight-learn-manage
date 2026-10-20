ALTER TABLE public.documents_a_signer ADD COLUMN IF NOT EXISTS reinscription_examen text;

CREATE TABLE public.documents_a_signer_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents_a_signer(id),
  apprenant_id uuid,
  choix text NOT NULL,
  reinscription_examen text,
  signature text NOT NULL,
  signe_le timestamptz NOT NULL DEFAULT now(),
  signe_le_paris text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.documents_a_signer_revisions(document_id, signe_le);
CREATE INDEX ON public.documents_a_signer_revisions(apprenant_id);
GRANT SELECT ON public.documents_a_signer_revisions TO authenticated;
GRANT ALL ON public.documents_a_signer_revisions TO service_role;
ALTER TABLE public.documents_a_signer_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent revisions choix" ON public.documents_a_signer_revisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Eleve lit ses revisions choix" ON public.documents_a_signer_revisions FOR SELECT TO authenticated USING (public.est_proprietaire_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.documents_a_signer_revisions_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Révision de choix conservée : modification ou suppression interdite' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER trg_revisions_choix_append_only BEFORE UPDATE OR DELETE ON public.documents_a_signer_revisions
FOR EACH ROW EXECUTE FUNCTION public.documents_a_signer_revisions_append_only();

CREATE POLICY "Eleve lit son choix pratique signe" ON public.documents_a_signer FOR SELECT TO authenticated
USING (modele_code = 'echec_theorie_choix_pratique' AND apprenant_id IS NOT NULL AND public.est_proprietaire_apprenant(apprenant_id) AND (envoye_le IS NOT NULL OR statut = 'signe'));