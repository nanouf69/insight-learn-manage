CREATE TABLE public.emargement_dossiers_lies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  autorise_par text NOT NULL,
  motif text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, apprenant_id)
);
GRANT SELECT, INSERT ON public.emargement_dossiers_lies TO authenticated;
GRANT ALL ON public.emargement_dossiers_lies TO service_role;
ALTER TABLE public.emargement_dossiers_lies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage emargement links" ON public.emargement_dossiers_lies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Learner reads own emargement links" ON public.emargement_dossiers_lies FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.emargement_dossiers_lies_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'emargement_dossiers_lies est append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER trg_emargement_dossiers_lies_append_only BEFORE UPDATE OR DELETE ON public.emargement_dossiers_lies
FOR EACH ROW EXECUTE FUNCTION public.emargement_dossiers_lies_append_only();

CREATE OR REPLACE FUNCTION public.est_dossier_lie_emargement(_apprenant_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.emargement_dossiers_lies l
    WHERE l.apprenant_id = _apprenant_id AND l.auth_user_id = auth.uid())
$$;

CREATE POLICY "Learner reads linked dossier reservations" ON public.reservations_pratique FOR SELECT TO authenticated
  USING (public.est_dossier_lie_emargement(apprenant_id));
CREATE POLICY "Learner reads linked dossier session links" ON public.session_apprenants FOR SELECT TO authenticated
  USING (public.est_dossier_lie_emargement(apprenant_id));
CREATE POLICY "Learner reads linked dossier sessions" ON public.sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_apprenants sa WHERE sa.session_id = sessions.id AND public.est_dossier_lie_emargement(sa.apprenant_id)));
CREATE POLICY "Learner reads linked dossier emargements" ON public.emargements_fc FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.est_dossier_lie_emargement(apprenant_id));