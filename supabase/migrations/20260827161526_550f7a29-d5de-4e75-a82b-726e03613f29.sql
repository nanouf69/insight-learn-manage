CREATE TABLE public.documents_a_signer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  file_path text NOT NULL,
  champs jsonb NOT NULL DEFAULT '[]'::jsonb,
  destinataire_nom text,
  destinataire_email text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  statut text NOT NULL DEFAULT 'brouillon',
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  signed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents_a_signer TO authenticated;
GRANT ALL ON public.documents_a_signer TO service_role;

ALTER TABLE public.documents_a_signer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff manage documents_a_signer"
ON public.documents_a_signer FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_documents_a_signer_updated_at
BEFORE UPDATE ON public.documents_a_signer
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();