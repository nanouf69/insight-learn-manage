CREATE TABLE public.fc_acces_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  actif boolean NOT NULL DEFAULT false,
  actif_depuis timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.fc_acces_config (id, actif) VALUES (true, false);
GRANT SELECT ON public.fc_acces_config TO authenticated;
GRANT ALL ON public.fc_acces_config TO service_role;
ALTER TABLE public.fc_acces_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fc_config admin lecture" ON public.fc_acces_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.fc_paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreinte text NOT NULL UNIQUE,
  transaction_ids uuid[] NOT NULL DEFAULT '{}',
  date_operation date NOT NULL,
  montant numeric NOT NULL,
  libelle text NOT NULL,
  statut text NOT NULL DEFAULT 'a_revoir' CHECK (statut IN ('a_revoir','rapproche','acces_envoye','echec_envoi','ignore','rembourse','deja_servi')),
  historique boolean NOT NULL DEFAULT true,
  apprenant_id uuid,
  candidats uuid[] NOT NULL DEFAULT '{}',
  motif text,
  associe_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fc_paiements TO authenticated;
GRANT ALL ON public.fc_paiements TO service_role;
ALTER TABLE public.fc_paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fc_paiements admin lecture" ON public.fc_paiements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.fc_acces_envois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  paiement_id uuid NOT NULL REFERENCES public.fc_paiements(id),
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','envoye','echec')),
  compte text CHECK (compte IN ('cree','existant')),
  erreur text,
  declencheur text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  termine_at timestamptz
);
CREATE UNIQUE INDEX fc_acces_envois_un_seul ON public.fc_acces_envois (apprenant_id) WHERE statut IN ('en_cours','envoye');
GRANT SELECT ON public.fc_acces_envois TO authenticated;
GRANT ALL ON public.fc_acces_envois TO service_role;
ALTER TABLE public.fc_acces_envois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fc_envois admin lecture" ON public.fc_acces_envois FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.fc_sans_suppression() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Suppression interdite (historique paiements FC)' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER trg_fc_paiements_sans_suppression BEFORE DELETE ON public.fc_paiements FOR EACH ROW EXECUTE FUNCTION public.fc_sans_suppression();
CREATE TRIGGER trg_fc_envois_sans_suppression BEFORE DELETE ON public.fc_acces_envois FOR EACH ROW EXECUTE FUNCTION public.fc_sans_suppression();