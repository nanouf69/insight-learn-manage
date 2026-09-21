CREATE TABLE public.prestataire_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT,
  est_test BOOLEAN NOT NULL DEFAULT false,
  -- Prestataire
  prestataire_nom TEXT,
  prestataire_prenom TEXT,
  raison_sociale TEXT,
  siren TEXT,
  siret TEXT,
  adresse TEXT,
  email TEXT,
  telephone TEXT,
  -- Prestation
  description_prestation TEXT,
  date_prestation DATE,
  periode_debut DATE,
  periode_fin DATE,
  numero_commande TEXT,
  montant_ht NUMERIC(12,2),
  tva NUMERIC(12,2),
  montant_ttc NUMERIC(12,2),
  commentaire_interne TEXT,
  -- Paiement
  date_paiement DATE,
  montant_paye NUMERIC(12,2),
  mode_paiement TEXT,
  reference_paiement TEXT,
  -- Facture reçue
  facture_recue_le DATE,
  facture_numero TEXT,
  facture_montant_ht NUMERIC(12,2),
  facture_tva NUMERIC(12,2),
  facture_montant_ttc NUMERIC(12,2),
  statut TEXT NOT NULL DEFAULT 'facture_manquante',
  derniere_action_le TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestataire_dossiers TO authenticated;
GRANT ALL ON public.prestataire_dossiers TO service_role;
ALTER TABLE public.prestataire_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prestataire_dossiers" ON public.prestataire_dossiers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prestataire_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.prestataire_dossiers(id) ON DELETE CASCADE,
  type_piece TEXT NOT NULL DEFAULT 'autre',
  titre TEXT,
  chemin TEXT NOT NULL,
  nom_fichier TEXT,
  content_type TEXT,
  taille BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prestataire_pieces_dossier ON public.prestataire_pieces(dossier_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestataire_pieces TO authenticated;
GRANT ALL ON public.prestataire_pieces TO service_role;
ALTER TABLE public.prestataire_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prestataire_pieces" ON public.prestataire_pieces
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prestataire_envois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.prestataire_dossiers(id) ON DELETE CASCADE,
  type_envoi TEXT NOT NULL DEFAULT 'demande',
  destinataire_nom TEXT,
  destinataire_email TEXT NOT NULL,
  objet TEXT NOT NULL,
  corps_html TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  erreur TEXT,
  provider_message_id TEXT,
  envoye_le TIMESTAMPTZ,
  declenche_par UUID,
  declenche_par_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prestataire_envois_dossier ON public.prestataire_envois(dossier_id, created_at DESC);

GRANT SELECT, INSERT ON public.prestataire_envois TO authenticated;
GRANT ALL ON public.prestataire_envois TO service_role;
ALTER TABLE public.prestataire_envois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read prestataire_envois" ON public.prestataire_envois
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins create prestataire_envois" ON public.prestataire_envois
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.protect_prestataire_envois()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.objet IS DISTINCT FROM OLD.objet
       OR NEW.corps_html IS DISTINCT FROM OLD.corps_html
       OR NEW.destinataire_email IS DISTINCT FROM OLD.destinataire_email
       OR NEW.dossier_id IS DISTINCT FROM OLD.dossier_id
       OR NEW.type_envoi IS DISTINCT FROM OLD.type_envoi
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Historique d''envoi immuable : le contenu envoyé ne peut pas être modifié';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Historique d''envoi immuable : suppression interdite';
END;
$$;

CREATE TRIGGER trg_protect_prestataire_envois
  BEFORE UPDATE OR DELETE ON public.prestataire_envois
  FOR EACH ROW EXECUTE FUNCTION public.protect_prestataire_envois();

CREATE TABLE public.prestataire_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.prestataire_dossiers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  utilisateur UUID,
  utilisateur_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prestataire_historique_dossier ON public.prestataire_historique(dossier_id, created_at DESC);

GRANT SELECT, INSERT ON public.prestataire_historique TO authenticated;
GRANT ALL ON public.prestataire_historique TO service_role;
ALTER TABLE public.prestataire_historique ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read prestataire_historique" ON public.prestataire_historique
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins create prestataire_historique" ON public.prestataire_historique
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prestataire_email_templates (
  id TEXT PRIMARY KEY,
  objet TEXT NOT NULL DEFAULT '',
  corps TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestataire_email_templates TO authenticated;
GRANT ALL ON public.prestataire_email_templates TO service_role;
ALTER TABLE public.prestataire_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prestataire_email_templates" ON public.prestataire_email_templates
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_prestataire_dossiers_updated BEFORE UPDATE ON public.prestataire_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();