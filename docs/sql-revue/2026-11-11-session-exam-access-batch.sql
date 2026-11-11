-- PREPARATION ONLY, after 2026-11-11-session-exam-access.sql.
-- Same event journal and exact start lock; no activation and no seed.
CREATE TABLE public.session_exam_access_batches (
 operation_id uuid PRIMARY KEY, exam_id text NOT NULL, opened boolean NOT NULL,
 selections jsonb NOT NULL, author uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 receipt jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.session_exam_access_batches TO authenticated;
GRANT ALL ON public.session_exam_access_batches TO service_role;
ALTER TABLE public.session_exam_access_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY batch_admin_read ON public.session_exam_access_batches FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER batch_immutable BEFORE UPDATE OR DELETE ON public.session_exam_access_batches
 FOR EACH ROW EXECUTE FUNCTION public.session_exam_access_immutable();

CREATE FUNCTION public.admin_set_sessions_exam_access(p_operation_id uuid,p_exam_id text,p_opened boolean,p_selections jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.session_exam_access_batches; item jsonb; s public.sessions; current_op uuid;
 events jsonb:='[]'; event jsonb; today date:=(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN
 RAISE EXCEPTION 'Réservé à l’administration.' USING ERRCODE='42501'; END IF;
 IF p_operation_id IS NULL OR p_opened IS NULL OR p_exam_id IS NULL OR jsonb_typeof(p_selections) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_selections)=0 THEN RAISE EXCEPTION 'Sélection incomplète.' USING ERRCODE='P0482'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('session-exam-access:'||p_exam_id,0));
 SELECT * INTO b FROM public.session_exam_access_batches WHERE operation_id=p_operation_id;
 IF FOUND THEN
 IF b.exam_id<>p_exam_id OR b.opened<>p_opened OR b.selections<>p_selections THEN
 RAISE EXCEPTION 'Opération liée à une autre sélection.' USING ERRCODE='P0482'; END IF;
 RETURN b.receipt; END IF;
 IF (SELECT count(DISTINCT x->>'session_id') FROM jsonb_array_elements(p_selections)x)<>jsonb_array_length(p_selections)
 THEN RAISE EXCEPTION 'Sessions dupliquées ou identifiants manquants.' USING ERRCODE='P0482'; END IF;
 -- Complete validation before any event is appended; one failure aborts all.
 FOR item IN SELECT x FROM jsonb_array_elements(p_selections)x ORDER BY x->>'session_id' LOOP
 SELECT * INTO s FROM public.sessions WHERE id=(item->>'session_id')::uuid FOR SHARE;
 IF NOT FOUND OR s.nom IS NULL OR s.nom IS DISTINCT FROM item->>'session_name'
 OR s.date_debut IS NULL OR s.date_fin IS NULL OR s.date_fin<s.date_debut OR s.date_fin<today
 OR lower(coalesce(s.nom,'')) ~ 'e[ -]?learning|distanciel|en[ -]ligne|online'
 OR EXISTS(SELECT 1 FROM unnest(s.types_apprenant)t WHERE lower(t) ~ 'e[ -]?learning|distanciel|en[ -]ligne|online|^(vtc|taxi|ta|va)[ -]e$')
 OR NOT EXISTS(SELECT 1 FROM public.session_exam_catalog(s.id)c WHERE c.exam_id=p_exam_id)
 THEN RAISE EXCEPTION 'Session passée, à distance, incompatible ou non concordante.' USING ERRCODE='P0482'; END IF;
 SELECT operation_id INTO current_op FROM public.session_exam_access_events WHERE session_id=s.id AND exam_id=p_exam_id
 ORDER BY revision DESC LIMIT 1;
 IF current_op IS DISTINCT FROM (item->>'expected_operation_id')::uuid THEN
 RAISE EXCEPTION 'État modifié : relisez toutes les sessions.' USING ERRCODE='P0482'; END IF;
 END LOOP;
 FOR item IN SELECT x FROM jsonb_array_elements(p_selections)x ORDER BY x->>'session_id' LOOP
 event:=public.admin_set_session_exam_access(gen_random_uuid(),(item->>'session_id')::uuid,p_exam_id,p_opened,
 (item->>'expected_operation_id')::uuid,item->>'session_name');
 events:=events||jsonb_build_array(event);
 END LOOP;
 event:=jsonb_build_object('operation_id',p_operation_id,'exam_id',p_exam_id,'opened',p_opened,'events',events);
 INSERT INTO public.session_exam_access_batches(operation_id,exam_id,opened,selections,author,receipt)
 VALUES(p_operation_id,p_exam_id,p_opened,p_selections,auth.uid(),event);
 RETURN event;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_sessions_exam_access(uuid,text,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_sessions_exam_access(uuid,text,boolean,jsonb) TO authenticated;