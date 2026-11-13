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
 original jsonb NOT NULL,
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
DECLARE d public.presentiel_validation_decisions; previous public.presentiel_validation_decisions; v public.presentiel_heures_validees; motif_effectif text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 motif_effectif := CASE WHEN p_action='annuler' THEN 'Révocation confirmée par l’administration' ELSE btrim(coalesce(p_motif,'')) END;
 IF p_action NOT IN ('annuler','restaurer') OR p_action IS NULL OR p_version IS NULL OR p_version<0 OR p_operation IS NULL OR p_validation IS NULL OR p_apprenant IS NULL OR length(motif_effectif) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Décision invalide' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('presence_decision:'||p_validation::text));
 PERFORM pg_advisory_xact_lock(hashtext('releve_fin_acces:'||p_apprenant::text));
 SELECT * INTO v FROM public.presentiel_heures_validees WHERE id=p_validation AND apprenant_id=p_apprenant FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Validation étrangère ou introuvable' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.presentiel_validation_decisions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF d.validation_id=p_validation AND d.apprenant_id=p_apprenant AND d.action=p_action AND d.motif=motif_effectif AND d.version=p_version+1 AND d.created_by=auth.uid() THEN RETURN d; END IF;
  RAISE EXCEPTION 'Opération contradictoire' USING ERRCODE='P0551';
 END IF;
 -- Fail closed around pedagogical/frozen evidence. A separate approved version workflow is needed.
 IF EXISTS(SELECT 1 FROM public.edof_fin_formation WHERE apprenant_id=p_apprenant)
 OR EXISTS(SELECT 1 FROM public.releve_jalons_fin_acces WHERE apprenant_id=p_apprenant)
 OR EXISTS(SELECT 1 FROM public.releve_jalons_gels WHERE apprenant_id=p_apprenant) THEN
  RAISE EXCEPTION 'Dossier protégé : revue nominative avant changement' USING ERRCODE='42501';
 END IF;
 SELECT * INTO previous FROM public.presentiel_validation_decisions WHERE validation_id=p_validation ORDER BY version DESC LIMIT 1;
 IF coalesce(previous.version,0)<>p_version THEN RAISE EXCEPTION 'Version périmée : relire' USING ERRCODE='P0551'; END IF;
 IF p_action=coalesce(previous.action,'restaurer') THEN RAISE EXCEPTION 'État déjà appliqué' USING ERRCODE='22023'; END IF;
 INSERT INTO public.presentiel_validation_decisions(operation_id,validation_id,apprenant_id,version,action,motif,created_by,original)
 VALUES(p_operation,p_validation,p_apprenant,p_version+1,p_action,motif_effectif,auth.uid(),to_jsonb(v)) RETURNING * INTO d;
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.presentiel_decider_validation(uuid,uuid,uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_decider_validation(uuid,uuid,uuid,integer,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.presentiel_decisions_append_only() FROM PUBLIC,anon,authenticated;

-- Live projection for server readers. No change to originals, signatures or frozen archives.
CREATE FUNCTION public.presentiel_validations_effectives(p_apprenant uuid)
RETURNS SETOF public.presentiel_heures_validees LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT v.* FROM public.presentiel_heures_validees v
 WHERE v.apprenant_id=p_apprenant AND public.has_role(auth.uid(),'admin')
 AND coalesce((SELECT d.action FROM public.presentiel_validation_decisions d WHERE d.validation_id=v.id ORDER BY d.version DESC LIMIT 1),'restaurer')='restaurer'
$$;
REVOKE ALL ON FUNCTION public.presentiel_validations_effectives(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_validations_effectives(uuid) TO authenticated,service_role;

-- Future server snapshots must omit revoked validations; existing snapshots are never rewritten.
DO $$
DECLARE definition text; needle text := 'FROM public.presentiel_heures_validees WHERE apprenant_id = _id)';
BEGIN
 definition := pg_get_functiondef('public.releve_sources_apprenant(uuid)'::regprocedure);
 IF position(needle in definition)=0 THEN RAISE EXCEPTION 'Lecteur serveur différent du catalogue vérifié : installation refusée'; END IF;
 EXECUTE replace(definition,needle,
  'FROM public.presentiel_heures_validees v WHERE apprenant_id = _id AND coalesce((SELECT d.action FROM public.presentiel_validation_decisions d WHERE d.validation_id=v.id ORDER BY d.version DESC LIMIT 1),''restaurer'')=''restaurer'')');
END $$;