ALTER TABLE public.documents_a_signer
  ADD COLUMN IF NOT EXISTS modele_code text,
  ADD COLUMN IF NOT EXISTS modele_version text,
  ADD COLUMN IF NOT EXISTS texte_fige text,
  ADD COLUMN IF NOT EXISTS texte_empreinte text,
  ADD COLUMN IF NOT EXISTS apprenant_id uuid,
  ADD COLUMN IF NOT EXISTS choix text,
  ADD COLUMN IF NOT EXISTS signe_le_paris text,
  ADD COLUMN IF NOT EXISTS envoye_le timestamptz;

CREATE INDEX IF NOT EXISTS idx_documents_a_signer_modele_apprenant
  ON public.documents_a_signer (modele_code, apprenant_id);

CREATE OR REPLACE FUNCTION public.documents_a_signer_preuve_immuable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modele_code IS NOT NULL THEN
      RAISE EXCEPTION 'Document modèle conservé : suppression interdite' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.modele_code IS NOT NULL AND OLD.statut = 'signe' THEN
    RAISE EXCEPTION 'Preuve signée immuable' USING ERRCODE = '42501';
  END IF;
  IF OLD.modele_code IS NOT NULL AND OLD.texte_fige IS NOT NULL
     AND (NEW.texte_fige IS DISTINCT FROM OLD.texte_fige
          OR NEW.modele_version IS DISTINCT FROM OLD.modele_version
          OR NEW.texte_empreinte IS DISTINCT FROM OLD.texte_empreinte
          OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id
          OR NEW.token IS DISTINCT FROM OLD.token) THEN
    RAISE EXCEPTION 'Texte et destinataire figés' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_documents_a_signer_preuve_immuable ON public.documents_a_signer;
CREATE TRIGGER trg_documents_a_signer_preuve_immuable
BEFORE UPDATE OR DELETE ON public.documents_a_signer
FOR EACH ROW EXECUTE FUNCTION public.documents_a_signer_preuve_immuable();