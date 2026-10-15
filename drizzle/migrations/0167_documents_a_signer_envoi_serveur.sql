ALTER TABLE public.documents_a_signer
  ADD COLUMN IF NOT EXISTS cle_envoi text,
  ADD COLUMN IF NOT EXISTS identite_figee jsonb,
  ADD COLUMN IF NOT EXISTS mail_objet_fige text,
  ADD COLUMN IF NOT EXISTS mail_html_fige text,
  ADD COLUMN IF NOT EXISTS envoi_etat text,
  ADD COLUMN IF NOT EXISTS envoi_tente_le timestamptz,
  ADD COLUMN IF NOT EXISTS envoi_erreur text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_a_signer_modele_envoi
  ON public.documents_a_signer (modele_code, apprenant_id, cle_envoi, modele_version);

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
     AND (NEW.modele_code IS DISTINCT FROM OLD.modele_code
          OR NEW.texte_fige IS DISTINCT FROM OLD.texte_fige
          OR NEW.modele_version IS DISTINCT FROM OLD.modele_version
          OR NEW.texte_empreinte IS DISTINCT FROM OLD.texte_empreinte
          OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id
          OR NEW.token IS DISTINCT FROM OLD.token
          OR NEW.destinataire_nom IS DISTINCT FROM OLD.destinataire_nom
          OR NEW.destinataire_email IS DISTINCT FROM OLD.destinataire_email
          OR NEW.cle_envoi IS DISTINCT FROM OLD.cle_envoi
          OR (OLD.identite_figee IS NOT NULL AND NEW.identite_figee IS DISTINCT FROM OLD.identite_figee)
          OR (OLD.mail_objet_fige IS NOT NULL AND NEW.mail_objet_fige IS DISTINCT FROM OLD.mail_objet_fige)
          OR (OLD.mail_html_fige IS NOT NULL AND NEW.mail_html_fige IS DISTINCT FROM OLD.mail_html_fige)
          OR (OLD.envoye_le IS NOT NULL AND NEW.envoye_le IS DISTINCT FROM OLD.envoye_le)
          OR (OLD.envoi_tente_le IS NOT NULL AND NEW.envoi_tente_le IS DISTINCT FROM OLD.envoi_tente_le AND OLD.envoye_le IS NOT NULL)) THEN
    RAISE EXCEPTION 'Texte, identité et envoi figés' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;