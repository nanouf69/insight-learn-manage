CREATE TABLE public.signalements_reponses_envois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suivi_id uuid NOT NULL REFERENCES public.signalements_suivi(id),
  signalement_id uuid NOT NULL REFERENCES public.signalements_apprenants(id),
  destinataire text NOT NULL,
  sujet text NOT NULL,
  copie_html text NOT NULL,
  copie_texte text NOT NULL,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','envoye','echec')),
  erreur text,
  envoye_le timestamptz,
  demande_par uuid,
  demande_par_nom text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signalements_reponses_envois TO authenticated;
GRANT ALL ON public.signalements_reponses_envois TO service_role;
ALTER TABLE public.signalements_reponses_envois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les envois de reponses" ON public.signalements_reponses_envois FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Apprenant lit ses reponses envoyees" ON public.signalements_reponses_envois FOR SELECT TO authenticated
  USING (statut = 'envoye' AND EXISTS (SELECT 1 FROM public.signalements_apprenants s WHERE s.id = signalement_id AND s.auth_user_id = auth.uid()));
CREATE UNIQUE INDEX signalements_reponse_un_envoi_actif ON public.signalements_reponses_envois(suivi_id) WHERE statut <> 'echec';
CREATE INDEX signalements_reponses_envois_ticket_idx ON public.signalements_reponses_envois(signalement_id, created_at);
CREATE OR REPLACE FUNCTION public.signalements_reponses_envois_garde()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Suppression interdite' USING ERRCODE = '42501'; END IF;
  IF OLD.statut <> 'en_cours' OR NEW.statut = 'en_cours'
     OR NEW.suivi_id IS DISTINCT FROM OLD.suivi_id OR NEW.signalement_id IS DISTINCT FROM OLD.signalement_id
     OR NEW.destinataire IS DISTINCT FROM OLD.destinataire OR NEW.sujet IS DISTINCT FROM OLD.sujet
     OR NEW.copie_html IS DISTINCT FROM OLD.copie_html OR NEW.copie_texte IS DISTINCT FROM OLD.copie_texte
     OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.demande_par IS DISTINCT FROM OLD.demande_par THEN
    RAISE EXCEPTION 'Envoi de réponse immuable (seul le résultat d''un envoi en cours peut être enregistré)' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_signalements_reponses_envois_garde BEFORE UPDATE OR DELETE ON public.signalements_reponses_envois
  FOR EACH ROW EXECUTE FUNCTION public.signalements_reponses_envois_garde();