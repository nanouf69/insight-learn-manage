CREATE TABLE public.intervenant_contresignatures_centre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents_a_signer(id),
  preuve_intervenant_id uuid NOT NULL REFERENCES public.intervenant_signature_preuves(id),
  operation_id uuid NOT NULL UNIQUE,
  admin_user_id uuid NOT NULL,
  signataire_nom text NOT NULL,
  signataire_qualite text NOT NULL,
  consentement_texte text NOT NULL,
  signature_data_url text NOT NULL,
  signature_empreinte text NOT NULL CHECK (signature_empreinte ~ '^[a-f0-9]{64}$'),
  pdf_intervenant_empreinte text NOT NULL CHECK (pdf_intervenant_empreinte ~ '^[a-f0-9]{64}$'),
  pdf_path text NOT NULL UNIQUE,
  pdf_empreinte text NOT NULL CHECK (pdf_empreinte ~ '^[a-f0-9]{64}$'),
  signed_at timestamptz NOT NULL,
  signe_le_paris text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intervenant_contresignatures_centre TO authenticated;
GRANT ALL ON public.intervenant_contresignatures_centre TO service_role;
ALTER TABLE public.intervenant_contresignatures_centre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les contresignatures" ON public.intervenant_contresignatures_centre FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.contresignature_centre_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Contresignature immuable' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER trg_contresignature_centre_append_only BEFORE UPDATE OR DELETE ON public.intervenant_contresignatures_centre FOR EACH ROW EXECUTE FUNCTION public.contresignature_centre_append_only();