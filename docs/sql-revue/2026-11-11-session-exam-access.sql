-- PREPARATION ONLY. Not installed; no seed, activation, or change of existing access.
CREATE TABLE public.session_exam_access_events (
 operation_id uuid PRIMARY KEY,
 session_id uuid NOT NULL REFERENCES public.sessions(id),
 exam_id text NOT NULL REFERENCES public.examens_blancs_parcours(exam_id),
 opened boolean NOT NULL,
 expected_operation_id uuid,
 author uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 revision bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
GRANT SELECT ON public.session_exam_access_events TO authenticated;
GRANT ALL ON public.session_exam_access_events TO service_role;
ALTER TABLE public.session_exam_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_exam_access_admin_read ON public.session_exam_access_events
 FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.session_exam_access_immutable() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
 BEGIN RAISE EXCEPTION 'Journal des accès immuable.' USING ERRCODE='42501'; END $$;
CREATE TRIGGER session_exam_access_immutable BEFORE UPDATE OR DELETE ON public.session_exam_access_events
 FOR EACH ROW EXECUTE FUNCTION public.session_exam_access_immutable();

-- Conservative equivalent of modeExamenBlancStrict; unknown modes are not treated as presential.
CREATE FUNCTION public.session_exam_mode(p_id uuid) RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT CASE
 WHEN public.core_est_elearning(a.type_apprenant)
   OR lower(concat_ws(' ',a.type_apprenant,a.formation_choisie,a.creneau_horaire)) ~ 'e[- ]?learning|en[- ]?ligne|online|distanciel'
 THEN 'elearning'
 WHEN lower(btrim(a.type_apprenant)) ~ '^(vtc|taxi|ta|va)(-exam)?$' THEN 'presentiel'
 ELSE 'inconnu' END FROM public.apprenants a WHERE a.id=p_id
$$;

-- Existing exam/module entitlement + session's recorded track catalog, without adding any module.
CREATE FUNCTION public.session_exam_catalog(p_session uuid) RETURNS TABLE(exam_id text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT p.exam_id FROM public.examens_blancs_parcours p JOIN public.sessions s ON s.id=p_session
 WHERE s.type_session IN ('theorique','theorique_pratique','vtc','vtc_soir','taxi')
 AND EXISTS (SELECT 1 FROM unnest(s.types_apprenant) track WHERE
   (p.module_id=35 AND lower(track) IN ('vtc','taxi','vtc e présentiel','taxi e présentiel'))
   OR (p.module_id=36 AND lower(track) IN ('taxi','taxi e présentiel'))
   OR (p.module_id=37 AND lower(track) IN ('ta','ta e présentiel'))
   OR (p.module_id=38 AND lower(track) IN ('va','va e présentiel')))
 ORDER BY p.exam_id
$$;

CREATE FUNCTION public.admin_session_exam_access_context(p_session_id uuid) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 DECLARE result jsonb;
 BEGIN
 IF NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN
  RAISE EXCEPTION 'Réservé à l’administration.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sessions WHERE id=p_session_id) THEN
  RAISE EXCEPTION 'Session introuvable.' USING ERRCODE='P0482'; END IF;
 SELECT jsonb_build_object('session_id',s.id,'session_name',s.nom,
  'exams',coalesce((SELECT jsonb_agg(jsonb_build_object('exam_id',c.exam_id,
   'opened',e.opened,'operation_id',e.operation_id,'changed_at',e.created_at) ORDER BY c.exam_id)
   FROM public.session_exam_catalog(s.id)c LEFT JOIN LATERAL (
     SELECT * FROM public.session_exam_access_events WHERE session_id=s.id AND exam_id=c.exam_id
     ORDER BY revision DESC LIMIT 1)e ON true),'[]'::jsonb)) INTO result
 FROM public.sessions s WHERE s.id=p_session_id;
 RETURN result;
 END $$;

CREATE FUNCTION public.admin_set_session_exam_access(p_operation_id uuid,p_session_id uuid,p_exam_id text,
 p_opened boolean,p_expected_operation_id uuid,p_session_name text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 DECLARE previous uuid; receipt public.session_exam_access_events; actual_name text;
 BEGIN
 IF NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN
  RAISE EXCEPTION 'Réservé à l’administration.' USING ERRCODE='42501'; END IF;
 IF p_operation_id IS NULL OR p_opened IS NULL THEN
  RAISE EXCEPTION 'Confirmation incomplète.' USING ERRCODE='P0482'; END IF;
 -- Exclusive against start guards; shared starts hold this same key until commit.
 PERFORM pg_advisory_xact_lock(hashtextextended('session-exam-access:'||p_exam_id,0));
 SELECT * INTO receipt FROM public.session_exam_access_events WHERE operation_id=p_operation_id;
 IF FOUND THEN
  IF receipt.session_id<>p_session_id OR receipt.exam_id<>p_exam_id OR receipt.opened<>p_opened
   OR receipt.expected_operation_id IS DISTINCT FROM p_expected_operation_id THEN
   RAISE EXCEPTION 'Opération liée à une autre confirmation.' USING ERRCODE='P0482'; END IF;
  RETURN to_jsonb(receipt);
 END IF;
 SELECT nom INTO actual_name FROM public.sessions WHERE id=p_session_id FOR SHARE;
 IF actual_name IS DISTINCT FROM p_session_name OR actual_name IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.session_exam_catalog(p_session_id)c WHERE c.exam_id=p_exam_id) THEN
  RAISE EXCEPTION 'Session, filière ou examen non concordant ; relisez la session.' USING ERRCODE='P0482'; END IF;
 SELECT operation_id INTO previous FROM public.session_exam_access_events
  WHERE session_id=p_session_id AND exam_id=p_exam_id ORDER BY revision DESC LIMIT 1;
 IF previous IS DISTINCT FROM p_expected_operation_id THEN
  RAISE EXCEPTION 'État modifié par une autre confirmation ; relisez avant de continuer.' USING ERRCODE='P0482'; END IF;
 INSERT INTO public.session_exam_access_events(operation_id,session_id,exam_id,opened,expected_operation_id,author)
 VALUES(p_operation_id,p_session_id,p_exam_id,p_opened,p_expected_operation_id,auth.uid()) RETURNING * INTO receipt;
 RETURN to_jsonb(receipt);
 END $$;

-- Private gate used only at creation boundaries, never by save/finalize/read/correction paths.
CREATE FUNCTION public.assert_session_exam_start(p_apprenant_id uuid,p_exam_id text) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 DECLARE blockers text;
 BEGIN
 PERFORM pg_advisory_xact_lock_shared(hashtextextended('session-exam-access:'||p_exam_id,0));
 IF public.session_exam_mode(p_apprenant_id) IS DISTINCT FROM 'presentiel' THEN RETURN; END IF;
 SELECT string_agg(s.nom||' ['||s.id||']',' ; ' ORDER BY s.id) INTO blockers
 FROM public.session_apprenants sa JOIN public.sessions s ON s.id=sa.session_id
 JOIN public.apprenants a ON a.id=sa.apprenant_id
 JOIN public.examens_blancs_parcours p ON p.exam_id=p_exam_id
 JOIN LATERAL (SELECT opened FROM public.session_exam_access_events
  WHERE session_id=s.id AND exam_id=p_exam_id ORDER BY revision DESC LIMIT 1)e ON true
 WHERE sa.apprenant_id=p_apprenant_id AND NOT coalesce(sa.liste_attente,false)
 AND p.module_id=ANY(coalesce(a.modules_autorises,ARRAY[]::integer[]))
 AND EXISTS(SELECT 1 FROM public.session_exam_catalog(s.id)c WHERE c.exam_id=p_exam_id)
 AND e.opened=false;
 IF blockers IS NOT NULL THEN
  RAISE EXCEPTION 'Accès à % fermé pour votre session : %. Les épreuves déjà commencées restent accessibles. Contactez le centre.',p_exam_id,blockers
   USING ERRCODE='P0551'; END IF;
 END $$;

CREATE FUNCTION public.session_exam_start_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 DECLARE eid text; mid text; open_attempt uuid;
 BEGIN
 IF TG_TABLE_NAME='exam_attempts_v2' THEN
  -- Explicit immutable historical imports are not new learner starts.
  IF NEW.snapshot->'source_historique'->>'result_id' IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.etat<>'en_cours' THEN RETURN NEW; END IF;
  PERFORM public.assert_session_exam_start(NEW.apprenant_id,NEW.exam_id);
 ELSIF TG_TABLE_NAME='exam_subject_retakes' THEN
  -- Existing receipt replay does not insert; every inserted receipt authorizes a NEW start.
  PERFORM public.assert_session_exam_start(NEW.apprenant_id,NEW.exam_id);
 ELSIF TG_TABLE_NAME='apprenant_examen_timers' THEN
  eid:=split_part(NEW.exercice_id,'__',1);mid:=split_part(NEW.exercice_id,'__',2);
  IF eid !~* '^(EB[1-6](-TAXI)?|EB[1-6]-(ta|va))$' THEN RETURN NEW; END IF;
  -- INSERT ON CONFLICT calls BEFORE INSERT, even for an existing legacy timer.
  IF EXISTS(SELECT 1 FROM public.apprenant_examen_timers t WHERE t.apprenant_id=NEW.apprenant_id
   AND t.exercice_id=NEW.exercice_id AND t.tentative=NEW.tentative) THEN RETURN NEW; END IF;
  -- V2 creates its frozen attempt before its timer; permit only matching stored tentative.
  SELECT attempt_id INTO open_attempt FROM public.exam_attempts_v2 a
   WHERE a.apprenant_id=NEW.apprenant_id AND a.exam_id=eid AND a.etat='en_cours'
   AND a.snapshot->>'matiere'=mid AND coalesce(nullif(a.snapshot->>'tentative','')::integer,1)=NEW.tentative;
  IF open_attempt IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM public.assert_session_exam_start(NEW.apprenant_id,eid);
 END IF;
 RETURN NEW;
 END $$;
CREATE TRIGGER session_exam_new_v2 BEFORE INSERT ON public.exam_attempts_v2
 FOR EACH ROW EXECUTE FUNCTION public.session_exam_start_guard();
CREATE TRIGGER session_exam_new_retake BEFORE INSERT ON public.exam_subject_retakes
 FOR EACH ROW EXECUTE FUNCTION public.session_exam_start_guard();
CREATE TRIGGER session_exam_new_timer BEFORE INSERT ON public.apprenant_examen_timers
 FOR EACH ROW EXECUTE FUNCTION public.session_exam_start_guard();

REVOKE ALL ON FUNCTION public.session_exam_access_immutable(),public.session_exam_mode(uuid),public.session_exam_catalog(uuid),
 public.assert_session_exam_start(uuid,text),public.session_exam_start_guard() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_session_exam_access_context(uuid),
 public.admin_set_session_exam_access(uuid,uuid,text,boolean,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_session_exam_access_context(uuid),
 public.admin_set_session_exam_access(uuid,uuid,text,boolean,uuid,text) TO authenticated;