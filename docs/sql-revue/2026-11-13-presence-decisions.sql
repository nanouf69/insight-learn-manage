-- REVIEW ONLY. Never installed by the preview. Originals and frozen statements stay untouched.
CREATE TABLE public.presentiel_validation_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL UNIQUE,
 validation_id uuid NOT NULL REFERENCES public.presentiel_heures_validees(id),
 apprenant_id uuid NOT NULL,
 version integer NOT NULL CHECK(version > 0),
 action text NOT NULL CHECK(action IN ('annuler','restaurer')),
 motif text NOT NULL CHECK(length(btrim(motif)) BETWEEN 5 AND 500),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(validation_id,version)
);
GRANT SELECT ON public.presentiel_validation_decisions TO authenticated;
GRANT ALL ON public.presentiel_validation_decisions TO service_role;
ALTER TABLE public.presentiel_validation_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.presentiel_validation_decisions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.presentiel_decisions_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Journal immuable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER decisions_immutable BEFORE UPDATE OR DELETE ON public.presentiel_validation_decisions FOR EACH ROW EXECUTE FUNCTION public.presentiel_decisions_append_only();
CREATE FUNCTION public.presentiel_decider_validation(p_operation uuid,p_apprenant uuid,p_validation uuid,p_version integer,p_action text,p_motif text)
RETURNS public.presentiel_validation_decisions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.presentiel_validation_decisions; previous public.presentiel_validation_decisions; v public.presentiel_heures_validees;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 IF p_action NOT IN ('annuler','restaurer') OR p_action IS NULL OR p_version IS NULL OR p_version<0 OR p_operation IS NULL OR length(btrim(coalesce(p_motif,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Décision invalide' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('presence_decision:'||p_validation::text));
 SELECT * INTO v FROM public.presentiel_heures_validees WHERE id=p_validation AND apprenant_id=p_apprenant;
 IF NOT FOUND THEN RAISE EXCEPTION 'Validation étrangère ou introuvable' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.presentiel_validation_decisions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF d.validation_id=p_validation AND d.apprenant_id=p_apprenant AND d.action=p_action AND d.motif=btrim(p_motif) AND d.version=p_version+1 AND d.created_by=auth.uid() THEN RETURN d; END IF;
  RAISE EXCEPTION 'Opération contradictoire' USING ERRCODE='40001';
 END IF;
 -- Fail closed around pedagogical/frozen evidence. A separate approved version workflow is needed.
 IF EXISTS(SELECT 1 FROM public.edof_fin_formation WHERE apprenant_id=p_apprenant)
 OR EXISTS(SELECT 1 FROM public.releve_jalons_fin_acces WHERE apprenant_id=p_apprenant)
 OR EXISTS(SELECT 1 FROM public.releve_jalons_gels WHERE apprenant_id=p_apprenant) THEN
  RAISE EXCEPTION 'Dossier protégé : revue nominative avant changement' USING ERRCODE='42501';
 END IF;
 SELECT * INTO previous FROM public.presentiel_validation_decisions WHERE validation_id=p_validation ORDER BY version DESC LIMIT 1;
 IF coalesce(previous.version,0)<>p_version THEN RAISE EXCEPTION 'Version périmée : relire' USING ERRCODE='40001'; END IF;
 IF p_action=coalesce(previous.action,'restaurer') THEN RAISE EXCEPTION 'État déjà appliqué' USING ERRCODE='22023'; END IF;
 INSERT INTO public.presentiel_validation_decisions(operation_id,validation_id,apprenant_id,version,action,motif,created_by)
 VALUES(p_operation,p_validation,p_apprenant,p_version+1,p_action,btrim(p_motif),auth.uid()) RETURNING * INTO d;
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.presentiel_decider_validation(uuid,uuid,uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_decider_validation(uuid,uuid,uuid,integer,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.presentiel_decisions_append_only() FROM PUBLIC,anon,authenticated;