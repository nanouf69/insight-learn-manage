-- CANDIDAT NON APPLIQUÉ — validation du contenu et restauration indépendante requises.
-- Aucune donnée source n'est modifiée ; les signatures sont des preuves nouvelles append-only.
CREATE TABLE public.intervenant_signature_preuves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE REFERENCES public.documents_a_signer(id),
  operation_id UUID NOT NULL UNIQUE,
  document_empreinte TEXT NOT NULL CHECK (document_empreinte ~ '^[a-f0-9]{64}$'),
  requete_empreinte TEXT NOT NULL CHECK (requete_empreinte ~ '^[a-f0-9]{64}$'),
  consentement_texte TEXT NOT NULL,
  signature_data_url TEXT NOT NULL,
  signature_empreinte TEXT NOT NULL CHECK (signature_empreinte ~ '^[a-f0-9]{64}$'),
  pdf_path TEXT NOT NULL UNIQUE,
  pdf_empreinte TEXT NOT NULL CHECK (pdf_empreinte ~ '^[a-f0-9]{64}$'),
  charge_utile JSONB NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  signe_le_paris TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intervenant_signature_preuves TO authenticated;
GRANT ALL ON public.intervenant_signature_preuves TO service_role;
ALTER TABLE public.intervenant_signature_preuves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read intervenant signature proofs"
ON public.intervenant_signature_preuves FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.intervenant_signature_preuve_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Preuve de signature intervenant immuable' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER trg_intervenant_signature_preuve_append_only
BEFORE UPDATE OR DELETE ON public.intervenant_signature_preuves
FOR EACH ROW EXECUTE FUNCTION public.intervenant_signature_preuve_append_only();
COMMENT ON TABLE public.intervenant_signature_preuves IS 'Preuves nouvelles de signatures formateurs ; ne remplace jamais la déclaration ou le contrat source.';

-- Anti-doublon limité au nouveau modèle : les autres modèles et leurs historiques ne changent pas.
CREATE UNIQUE INDEX uq_documents_contrat_intervenant_source_version
ON public.documents_a_signer(modele_code, cle_envoi, modele_version)
WHERE apprenant_id IS NULL AND modele_code = 'contrat_cadre_prestation_intervenant';
