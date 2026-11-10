-- Isolated candidate: append-only pedagogical revision, no official grade mutation.
CREATE TABLE public.revision_corrige_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 refs jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.revision_corrige_sessions TO authenticated;
GRANT ALL ON public.revision_corrige_sessions TO service_role;
ALTER TABLE public.revision_corrige_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revision_corrige_sessions_read ON public.revision_corrige_sessions FOR SELECT TO authenticated
 USING (public.core_est_proprietaire(owner_id) OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.revision_corrige_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.revision_corrige_sessions(id),
 seq bigint NOT NULL, operation_id uuid NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(session_id,seq), UNIQUE(session_id,operation_id)
);
CREATE INDEX revision_corrige_event_latest ON public.revision_corrige_events(session_id,seq DESC);
GRANT SELECT ON public.revision_corrige_events TO authenticated;
GRANT ALL ON public.revision_corrige_events TO service_role;
ALTER TABLE public.revision_corrige_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY revision_corrige_events_read ON public.revision_corrige_events FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.revision_corrige_sessions s WHERE s.id=session_id
 AND (public.core_est_proprietaire(s.owner_id) OR public.has_role(auth.uid(),'admin'))));

CREATE FUNCTION public.revision_corrige_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Historique de revision immuable' USING ERRCODE='P0551'; END; $$;
CREATE TRIGGER revision_corrige_sessions_immutable BEFORE UPDATE OR DELETE ON public.revision_corrige_sessions
 FOR EACH ROW EXECUTE FUNCTION public.revision_corrige_immutable();
CREATE TRIGGER revision_corrige_events_immutable BEFORE UPDATE OR DELETE ON public.revision_corrige_events
 FOR EACH ROW EXECUTE FUNCTION public.revision_corrige_immutable();
REVOKE ALL ON FUNCTION public.revision_corrige_immutable() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.revision_corrige_sources(p_owner uuid,p_refs jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_attempts uuid[];v_results uuid[];v_sources jsonb;v_out jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.core_est_proprietaire(p_owner) THEN
  RAISE EXCEPTION 'Acces eleve refuse' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_refs) IS DISTINCT FROM 'array' OR jsonb_array_length(p_refs) NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'Identites requises, 50 questions maximum' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_refs) r WHERE r->>'type' NOT IN ('attempt','result')
  OR r->>'id' IS NULL OR r->>'question' IS NULL) OR EXISTS(
  SELECT 1 FROM jsonb_array_elements(p_refs) r GROUP BY r HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Identite invalide ou dupliquee' USING ERRCODE='22023'; END IF;
 SELECT array_agg(DISTINCT (r->>'id')::uuid) FILTER(WHERE r->>'type'='attempt'),
  array_agg(DISTINCT (r->>'id')::uuid) FILTER(WHERE r->>'type'='result')
 INTO v_attempts,v_results FROM jsonb_array_elements(p_refs) r;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_refs) r WHERE
  (r->>'type'='attempt' AND NOT EXISTS(SELECT 1 FROM public.exam_attempts_v2 t WHERE t.attempt_id=(r->>'id')::uuid AND t.apprenant_id=p_owner))
  OR (r->>'type'='result' AND NOT EXISTS(SELECT 1 FROM public.apprenant_quiz_results t WHERE t.id=(r->>'id')::uuid AND t.apprenant_id=p_owner))) THEN
  RAISE EXCEPTION 'Copie autre eleve' USING ERRCODE='42501'; END IF;
 v_sources:=public.corriges_officiels_sources(v_attempts,v_results);
 SELECT jsonb_agg(s ORDER BY r->>'type',r->>'id',r->>'question') INTO v_out
 FROM jsonb_array_elements(p_refs) r JOIN jsonb_array_elements(v_sources) s
 ON s->>'source_type'=r->>'type' AND s->>'source_id'=r->>'id' AND s->>'question_id'=r->>'question';
 IF coalesce(jsonb_array_length(v_out),0)<>jsonb_array_length(p_refs) OR EXISTS(
  SELECT 1 FROM jsonb_array_elements(v_out) s WHERE s->>'statut'<>'rapproche') THEN
  RAISE EXCEPTION 'Corrige non rapproche, aucune validation inventee' USING ERRCODE='P0552'; END IF;
 RETURN v_out;
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_sources(uuid,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.revision_corrige_etat(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.revision_corrige_sessions;v_sources jsonb;v_answers jsonb;v_seq bigint;v_finished jsonb;
BEGIN
 SELECT * INTO s FROM public.revision_corrige_sessions WHERE id=p_session;
 IF s.id IS NULL OR auth.uid() IS NULL OR NOT public.core_est_proprietaire(s.owner_id) THEN
  RAISE EXCEPTION 'Acces eleve refuse' USING ERRCODE='42501'; END IF;
 v_sources:=public.revision_corrige_sources(s.owner_id,s.refs);
 SELECT coalesce(max(seq),0) INTO v_seq FROM public.revision_corrige_events WHERE session_id=s.id;
 SELECT coalesce(jsonb_object_agg(k,payload->'answer'),'{}'::jsonb) INTO v_answers FROM (
  SELECT DISTINCT ON (payload->>'key') payload->>'key' k,payload FROM public.revision_corrige_events
  WHERE session_id=s.id AND payload->>'kind'='answer' ORDER BY payload->>'key',seq DESC) a;
 SELECT payload INTO v_finished FROM public.revision_corrige_events WHERE session_id=s.id AND payload->>'kind'='submit' ORDER BY seq DESC LIMIT 1;
 RETURN jsonb_build_object('id',s.id,'owner_id',s.owner_id,'seq',v_seq,'sources',v_sources,
 'epoch',md5(v_sources::text),'answers',v_answers,'submission',v_finished);
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_etat(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_etat(uuid) TO authenticated;

CREATE FUNCTION public.revision_corrige_ouvrir(p_owner uuid,p_refs jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM public.revision_corrige_sources(p_owner,p_refs);
 -- Concurrent openings/reloads resume the exact same immutable source set.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||p_refs::text,0));
 SELECT s.id INTO v_id FROM public.revision_corrige_sessions s WHERE s.owner_id=p_owner AND s.refs=p_refs
 AND NOT EXISTS(SELECT 1 FROM public.revision_corrige_events e WHERE e.session_id=s.id AND e.payload->>'kind'='submit')
 ORDER BY s.created_at DESC,s.id DESC LIMIT 1;
 IF v_id IS NOT NULL THEN RETURN public.revision_corrige_etat(v_id); END IF;
 INSERT INTO public.revision_corrige_sessions(owner_id,refs) VALUES(p_owner,p_refs) RETURNING id INTO v_id;
 RETURN public.revision_corrige_etat(v_id);
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_ouvrir(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_ouvrir(uuid,jsonb) TO authenticated;

CREATE FUNCTION public.revision_corrige_commande(p_session uuid,p_seq bigint,p_epoch text,p_operation uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.revision_corrige_sessions;v_state jsonb;v_old jsonb;v_source jsonb;
 v_answers jsonb;v_answer jsonb;v_expected jsonb;v_given jsonb;v_perfect integer:=0;v_pending integer:=0;v_count integer:=0;v_payload jsonb;
BEGIN
 SELECT * INTO s FROM public.revision_corrige_sessions WHERE id=p_session FOR UPDATE;
 IF s.id IS NULL OR auth.uid() IS NULL OR NOT public.core_est_proprietaire(s.owner_id) THEN
  RAISE EXCEPTION 'Acces eleve refuse' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL THEN RAISE EXCEPTION 'Operation requise' USING ERRCODE='22023'; END IF;
 SELECT payload INTO v_old FROM public.revision_corrige_events WHERE session_id=s.id AND operation_id=p_operation;
 -- Idempotence verifies the exact command, not just its operation id.
 IF v_old IS NOT NULL THEN
  IF v_old->'command' IS DISTINCT FROM jsonb_build_object('seq',p_seq,'epoch',p_epoch,'payload',p_payload) THEN
   RAISE EXCEPTION 'Operation reutilisee avec une autre valeur' USING ERRCODE='P0553'; END IF;
  RETURN public.revision_corrige_etat(s.id);
 END IF;
 -- Lock the authoritative publication row against concurrent retirement.
 PERFORM v.id FROM public.exam_content_versions v WHERE v.statut='publiee' AND v.retired_at IS NULL
 AND v.exam_id IN (SELECT t.exam_id FROM public.exam_attempts_v2 t JOIN jsonb_array_elements(s.refs) r ON r->>'type'='attempt' AND t.attempt_id=(r->>'id')::uuid
 UNION SELECT t.quiz_id FROM public.apprenant_quiz_results t JOIN jsonb_array_elements(s.refs) r ON r->>'type'='result' AND t.id=(r->>'id')::uuid) ORDER BY v.id FOR SHARE;
 v_state:=public.revision_corrige_etat(s.id);
 IF v_state->'submission' <> 'null'::jsonb THEN RAISE EXCEPTION 'Revision deja remise' USING ERRCODE='P0554'; END IF;
 IF (v_state->>'seq')::bigint IS DISTINCT FROM p_seq THEN RAISE EXCEPTION 'Conflit de version, relire sans ecraser votre saisie' USING ERRCODE='P0555'; END IF;
 IF v_state->>'epoch' IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'Corrige modifie, relire et verifier vos reponses' USING ERRCODE='P0556'; END IF;
 IF p_payload->>'kind'='answer' THEN
  SELECT x INTO v_source FROM jsonb_array_elements(v_state->'sources') x
   WHERE (x->>'source_type')||'|'||(x->>'source_id')||'|'||(x->>'question_id')=p_payload->>'key';
  IF v_source IS NULL OR NOT(p_payload ? 'answer') THEN RAISE EXCEPTION 'Question et reponse requises' USING ERRCODE='22023'; END IF;
  IF (v_source#>>'{actuelle,type}'='QCM' AND jsonb_typeof(p_payload->'answer') IS DISTINCT FROM 'array') OR
   (v_source#>>'{actuelle,type}'='QRC' AND jsonb_typeof(p_payload->'answer') IS DISTINCT FROM 'string') THEN
   RAISE EXCEPTION 'Type de reponse invalide' USING ERRCODE='22023'; END IF;
  IF v_source#>>'{actuelle,type}'='QCM' AND (EXISTS(
   SELECT 1 FROM jsonb_array_elements(p_payload->'answer') c WHERE jsonb_typeof(c)<>'string'
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_source#>'{actuelle,choix}') o WHERE o->>'lettre'=c#>>'{}'))
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'answer') c GROUP BY c HAVING count(*)>1)) THEN
   RAISE EXCEPTION 'Choix inconnu ou duplique' USING ERRCODE='22023'; END IF;
  v_payload:=p_payload;
 ELSIF p_payload->>'kind'='submit' THEN
  v_answers:=v_state->'answers';
  FOR v_source IN SELECT x FROM jsonb_array_elements(v_state->'sources') x LOOP
   v_answer:=v_answers->((v_source->>'source_type')||'|'||(v_source->>'source_id')||'|'||(v_source->>'question_id'));
   IF v_answer IS NULL OR v_answer='null'::jsonb OR v_answer='[]'::jsonb OR v_answer='""'::jsonb THEN
    RAISE EXCEPTION 'Toutes les reponses doivent etre sauvegardees' USING ERRCODE='P0557'; END IF;
   v_count:=v_count+1;
   IF v_source#>>'{actuelle,type}'='QCM' THEN
    SELECT jsonb_agg(l ORDER BY l) INTO v_expected FROM (SELECT DISTINCT c->>'lettre' l FROM jsonb_array_elements(v_source#>'{actuelle,choix}') c WHERE c->>'correct'='true') e;
    SELECT jsonb_agg(l ORDER BY l) INTO v_given FROM (SELECT DISTINCT jsonb_array_elements_text(v_answer) l) g;
    IF v_given=v_expected THEN v_perfect:=v_perfect+1; END IF;
   ELSE
    -- Literal equality only; no keyword/semantic or fictitious human grade.
    IF jsonb_typeof(v_answer)='string' AND v_source#>>'{actuelle,reponseQRC}'=v_answer#>>'{}' AND length(v_answer#>>'{}')>0 THEN
     v_perfect:=v_perfect+1;
    ELSE v_pending:=v_pending+1; END IF;
   END IF;
  END LOOP;
  v_payload:=jsonb_build_object('kind','submit','epoch',p_epoch,'answers',v_answers,'sources',v_state->'sources',
   'perfect',v_perfect,'total',v_count,'qrc_a_verifier',v_pending,'note_examen_modifiee',false);
 ELSE RAISE EXCEPTION 'Commande inconnue' USING ERRCODE='22023'; END IF;
 INSERT INTO public.revision_corrige_events(session_id,seq,operation_id,payload) VALUES(s.id,p_seq+1,p_operation,
  v_payload||jsonb_build_object('command',jsonb_build_object('seq',p_seq,'epoch',p_epoch,'payload',p_payload)));
 RETURN public.revision_corrige_etat(s.id);
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_commande(uuid,bigint,text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_commande(uuid,bigint,text,uuid,jsonb) TO authenticated;

CREATE FUNCTION public.revision_corrige_admin(p_owner uuid,p_after uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_out jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
  RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 WITH sessions AS MATERIALIZED (
  SELECT * FROM public.revision_corrige_sessions WHERE owner_id=p_owner AND (p_after IS NULL OR id>p_after) ORDER BY id LIMIT 50
 ), latest AS (
  SELECT DISTINCT ON(e.session_id,e.payload->>'key') e.session_id,e.seq,e.created_at,e.payload
  FROM public.revision_corrige_events e JOIN sessions s ON s.id=e.session_id
  WHERE e.payload->>'kind'='answer' ORDER BY e.session_id,e.payload->>'key',e.seq DESC
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('session_id',s.id,'owner_id',s.owner_id,'refs',s.refs,
  'answers',coalesce((SELECT jsonb_agg(jsonb_build_object('key',e.payload->>'key','answer',e.payload->'answer','saved_at',e.created_at,'seq',e.seq)
   ORDER BY e.payload->>'key') FROM latest e WHERE e.session_id=s.id),'[]'::jsonb)) ORDER BY s.id),'[]'::jsonb)
 INTO v_out FROM sessions s;
 RETURN v_out;
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_admin(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_admin(uuid,uuid) TO authenticated;