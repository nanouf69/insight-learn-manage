-- Consolidated candidate (supersedes 2026-11-10-corriges-trois-surfaces.sql and
-- 2026-11-10-revision-corrige-versionnee.sql). Additive only: new tables/functions.
-- Never writes exam answers, results, attempts, snapshots, Bilan proofs, grades or content.

CREATE TABLE public.revision_corrige_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 refs jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX revision_corrige_sessions_owner ON public.revision_corrige_sessions(owner_id,id);
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

-- JSON null/scalars (e.g. "choix": null on QRC) are treated as empty arrays, never as an error.
CREATE FUNCTION public.corrige_tableau(x jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN jsonb_typeof(x)='array' THEN x ELSE '[]'::jsonb END $$;

-- Pure proof that the frozen question and the current official question are the same question.
-- NULL = proven same question with an official key; otherwise the explicit reason.
CREATE FUNCTION public.corrige_raison(h jsonb,a jsonb,n_frozen bigint,n_actuelle bigint) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE
  WHEN n_frozen<>1 OR n_actuelle>1 THEN 'identite_ambigue'
  WHEN a IS NULL THEN 'question_absente'
  WHEN h->>'type' IS DISTINCT FROM a->>'type' OR h->>'enonce' IS DISTINCT FROM a->>'enonce' THEN 'contenu_modifie'
  WHEN a->>'type'='QCM' AND (
   (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre',c->>'texte') FROM jsonb_array_elements(public.corrige_tableau(h->'choix')) c)
   IS DISTINCT FROM
   (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre',c->>'texte') FROM jsonb_array_elements(public.corrige_tableau(a->'choix')) c)) THEN 'contenu_modifie'
  WHEN a->>'type'='QCM' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.corrige_tableau(a->'choix')) c WHERE c->>'correct'='true') THEN 'sans_bonne_reponse'
  WHEN a->>'type'='QRC' AND coalesce(btrim(a->>'reponseQRC'),'')='' THEN 'sans_bonne_reponse'
  WHEN a->>'type' NOT IN ('QCM','QRC') THEN 'type_inconnu'
  ELSE NULL END
$$;

-- Read-only resolver, one row per frozen question, or one copy-level row when nothing can be proven.
CREATE FUNCTION public.corriges_sources_v2(p_copies jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_admin boolean; v_out jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_copies) IS DISTINCT FROM 'array' OR jsonb_array_length(p_copies)>50 THEN
  RAISE EXCEPTION 'TROP_DE_COPIES' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_copies) c WHERE jsonb_typeof(c)<>'object'
  OR c->>'type' IS NULL OR c->>'type' NOT IN ('attempt','result','bilan_snapshot','bilan_future')
  OR coalesce(c->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
  RAISE EXCEPTION 'COPIE_INVALIDE' USING ERRCODE='22023'; END IF;
 v_admin:=public.has_role(auth.uid(),'admin');
 WITH req AS (SELECT DISTINCT c->>'type' t,(c->>'id')::uuid id FROM jsonb_array_elements(p_copies) c),
 c AS MATERIALIZED (
  SELECT 'attempt'::text source_type,t.attempt_id source_id,a.auth_user_id owner_auth,t.exam_id,NULL::integer tentative,
   t.etat='terminee' termine,
   CASE WHEN coalesce(t.snapshot->>'matiere','')<>'' THEN t.snapshot->>'matiere'
        WHEN jsonb_typeof(t.snapshot->'matieres')='array' AND jsonb_array_length(t.snapshot->'matieres')=1
        THEN nullif(t.snapshot#>>'{matieres,0,subject_id}','') END matiere,
   t.snapshot->'questions' questions,'eb'::text circuit,
   (SELECT jsonb_object_agg(s.question_id,s.valeur) FROM public.answer_state s WHERE s.attempt_id=t.attempt_id) reponses,
   NULL::integer m_id,NULL::integer ex_id,NULL::integer subject
  FROM public.exam_attempts_v2 t JOIN req ON req.t='attempt' AND req.id=t.attempt_id
  LEFT JOIN public.apprenants a ON a.id=t.apprenant_id
  UNION ALL
  SELECT 'result',r.id,a.auth_user_id,r.quiz_id,r.tentative,r.quiz_type='examen_blanc' AND r.completed_at IS NOT NULL,
   nullif(r.matiere_id,''),r.details#>'{snapshot,questions}','eb',r.details->'reponses',NULL,NULL,NULL
  FROM public.apprenant_quiz_results r JOIN req ON req.t='result' AND req.id=r.id
  LEFT JOIN public.apprenants a ON a.id=r.apprenant_id
  UNION ALL
  SELECT 'bilan_snapshot',s.id,a.auth_user_id,'module_'||s.module_id||'_exo_'||s.exercice_id,s.tentative,
   ra.id IS NOT NULL,NULL,s.questions,'bilan_historique',ra.reponses,s.module_id,s.exercice_id,NULL
  FROM public.bilan_passage_snapshots s JOIN req ON req.t='bilan_snapshot' AND req.id=s.id
  LEFT JOIN public.apprenants a ON a.id=s.apprenant_id
  -- Only the submitted answer row of the SAME tentative proves the frozen passage.
  LEFT JOIN public.reponses_apprenants ra ON ra.apprenant_id=s.apprenant_id AND ra.exercice_id=s.passage_cle
   AND ra.tentative=s.tentative AND (ra.status='submitted' OR ra.completed IS TRUE)
  UNION ALL
  SELECT 'bilan_future',r.id,r.owner_id,'bilan_future_'||r.module_id||'_'||r.exercise_id,NULL,
   sub.receipt_id IS NOT NULL,NULL,v.questions,'bilan_futur',sub.answers,r.module_id,r.exercise_id,v.subject
  FROM public.bilan_future_receipts r JOIN req ON req.t='bilan_future' AND req.id=r.id
  JOIN public.bilan_future_versions v ON v.id=r.version_id
  LEFT JOIN public.bilan_future_submissions sub ON sub.receipt_id=r.id
 ), vis AS MATERIALIZED (
  SELECT *,CASE WHEN NOT termine THEN 'copie_non_terminee'
   WHEN jsonb_typeof(questions) IS DISTINCT FROM 'array' OR jsonb_array_length(questions)=0 THEN 'sans_snapshot'
   WHEN circuit='eb' AND matiere IS NULL THEN 'matiere_ambigue' END copy_raison
  FROM c WHERE v_admin OR (owner_auth IS NOT NULL AND owner_auth=auth.uid())
 ), ok AS MATERIALIZED (SELECT * FROM vis WHERE copy_raison IS NULL
 ), eb_active AS MATERIALIZED (
  SELECT DISTINCT ON (v.exam_id) v.exam_id,v.id,v.version_number,v.published_at,v.content
  FROM public.exam_content_versions v WHERE v.exam_id IN (SELECT exam_id FROM ok WHERE circuit='eb')
   AND v.statut='publiee' AND v.retired_at IS NULL AND v.is_test IS NOT TRUE
  ORDER BY v.exam_id,v.published_at DESC NULLS LAST,v.version_number DESC,v.id DESC
 ), editeur AS MATERIALIZED (
  SELECT ok.source_id,m.updated_at,m.source_fingerprint,
   (SELECT jsonb_agg(e) FROM jsonb_array_elements(public.corrige_tableau(m.module_data->'exercices')) e
     WHERE e->>'id'=ok.ex_id::text AND NOT coalesce(m.deleted_exercices,'[]'::jsonb) @> to_jsonb(ok.ex_id)
     AND NOT coalesce(m.deleted_exercices,'[]'::jsonb) @> to_jsonb(ok.ex_id::text)) exercices
  FROM ok JOIN public.module_editor_state m ON m.module_id=ok.m_id WHERE ok.circuit='bilan_historique'
 ), futur AS MATERIALIZED (
  SELECT ok.source_id,av.id version_id,av.created_at,av.fingerprint,av.questions
  FROM ok JOIN public.bilan_future_active fa ON fa.subject=ok.subject
  JOIN public.bilan_future_versions av ON av.id=fa.version_id WHERE ok.circuit='bilan_futur'
 ), frozen AS (
  SELECT ok.*,y.n position,y.q - 'question_source' historique,
   CASE ok.circuit WHEN 'eb' THEN CASE WHEN y.q->>'id' LIKE ok.matiere||':%' THEN y.q->>'id' ELSE ok.matiere||':'||(y.q->>'id') END
    WHEN 'bilan_historique' THEN y.q->>'uid' ELSE y.q->>'id' END qid,
   CASE ok.circuit WHEN 'bilan_historique' THEN y.q->>'cle' ELSE y.q->>'id' END cle_reponse
  FROM ok CROSS JOIN LATERAL jsonb_array_elements(ok.questions) WITH ORDINALITY y(q,n)
 ), counted AS (
  SELECT f.*,count(*) OVER (PARTITION BY f.source_type,f.source_id,f.qid) n_frozen FROM frozen f
 ), matched AS (
  SELECT f.*,
   CASE f.circuit WHEN 'eb' THEN (SELECT jsonb_agg(x) FROM jsonb_array_elements(public.corrige_tableau(ea.content->'questions')) x WHERE x->>'id'=f.qid)
    WHEN 'bilan_historique' THEN (SELECT jsonb_agg(x) FROM jsonb_array_elements(public.corrige_tableau(ed.exercices)) e,
      jsonb_array_elements(public.corrige_tableau(e->'questions')) x WHERE x->>'uid'=f.qid)
    ELSE (SELECT jsonb_agg(x) FROM jsonb_array_elements(public.corrige_tableau(fu.questions)) x WHERE x->>'id'=f.qid) END cand,
   CASE f.circuit WHEN 'eb' THEN CASE WHEN ea.id IS NULL THEN 'sans_publication' END
    WHEN 'bilan_historique' THEN CASE WHEN ed.exercices IS NULL THEN 'exercice_absent' WHEN jsonb_array_length(ed.exercices)>1 THEN 'identite_ambigue' END
    ELSE CASE WHEN fu.version_id IS NULL THEN 'sans_publication' END END source_raison,
   CASE f.circuit WHEN 'eb' THEN jsonb_build_object('kind','publication','version_id',ea.id,'version',ea.version_number,'date',ea.published_at)
    WHEN 'bilan_historique' THEN jsonb_build_object('kind','editeur','module_id',f.m_id,'exercice_id',f.ex_id,'date',ed.updated_at,'empreinte',ed.source_fingerprint)
    ELSE jsonb_build_object('kind','bilan_future','version_id',fu.version_id,'date',fu.created_at,'empreinte',fu.fingerprint) END provenance,
   ea.version_number,ea.published_at
  FROM counted f LEFT JOIN eb_active ea ON f.circuit='eb' AND ea.exam_id=f.exam_id
  LEFT JOIN editeur ed ON f.circuit='bilan_historique' AND ed.source_id=f.source_id
  LEFT JOIN futur fu ON f.circuit='bilan_futur' AND fu.source_id=f.source_id
 ), proof AS (
  SELECT m.*,coalesce(m.source_raison,CASE WHEN m.qid IS NULL THEN 'identite_ambigue' END,
   public.corrige_raison(m.historique,m.cand->0,m.n_frozen,coalesce(jsonb_array_length(m.cand),0))) raison
  FROM matched m
 )
 SELECT coalesce(jsonb_agg(x ORDER BY x->>'source_type',x->>'source_id',(x->>'position')::int NULLS FIRST),'[]'::jsonb) INTO v_out FROM (
  SELECT jsonb_build_object('source_type',source_type,'source_id',source_id,'exam_id',exam_id,'circuit',circuit,
   'tentative',tentative,'question_id',qid,'position',position,'historique',historique,
   'actuelle',CASE WHEN raison IS NULL THEN cand->0 END,'reponse_initiale',reponses->cle_reponse,
   'version',CASE WHEN circuit='eb' THEN version_number END,'publiee_le',(provenance->>'date'),'provenance',provenance,
   'statut',CASE WHEN raison IS NULL THEN 'rapproche' ELSE 'non_rapproche' END,'raison',raison) x FROM proof
  UNION ALL
  SELECT jsonb_build_object('source_type',source_type,'source_id',source_id,'exam_id',exam_id,'circuit',circuit,
   'tentative',tentative,'question_id',NULL,'position',NULL,'statut','non_rapproche','raison',copy_raison)
  FROM vis WHERE copy_raison IS NOT NULL
 ) z;
 RETURN v_out;
END; $$;
REVOKE ALL ON FUNCTION public.corriges_sources_v2(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.corriges_sources_v2(jsonb) TO authenticated,service_role;

-- Compatibility wrapper for the EB exam-correction panel (question rows only).
CREATE FUNCTION public.corriges_officiels_sources(p_attempt_ids uuid[],p_result_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v jsonb;
BEGIN
 IF coalesce(cardinality(p_attempt_ids),0)+coalesce(cardinality(p_result_ids),0)>50 THEN
  RAISE EXCEPTION 'TROP_DE_COPIES' USING ERRCODE='22023'; END IF;
 v:=public.corriges_sources_v2(coalesce((SELECT jsonb_agg(jsonb_build_object('type','attempt','id',i)) FROM unnest(p_attempt_ids) i),'[]'::jsonb)
  || coalesce((SELECT jsonb_agg(jsonb_build_object('type','result','id',i)) FROM unnest(p_result_ids) i),'[]'::jsonb));
 RETURN coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(v) x WHERE x->>'question_id' IS NOT NULL),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.corriges_officiels_sources(uuid[],uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.corriges_officiels_sources(uuid[],uuid[]) TO authenticated,service_role;

-- Pedagogical status against ONE official version: QCM exact set, QRC literal only.
CREATE FUNCTION public.revision_corrige_statut(p_source jsonb,p_answer jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE v_expected jsonb;v_given jsonb;
BEGIN
 IF p_source#>>'{actuelle,type}'='QCM' THEN
  IF jsonb_typeof(p_answer) IS DISTINCT FROM 'array' OR jsonb_array_length(p_answer)=0 THEN RETURN 'fausse'; END IF;
  SELECT jsonb_agg(l ORDER BY l) INTO v_expected FROM (SELECT DISTINCT c->>'lettre' l FROM jsonb_array_elements(p_source#>'{actuelle,choix}') c WHERE c->>'correct'='true') e;
  SELECT jsonb_agg(l ORDER BY l) INTO v_given FROM (SELECT DISTINCT x#>>'{}' l FROM jsonb_array_elements(p_answer) x) g;
  RETURN CASE WHEN v_given=v_expected THEN 'juste' ELSE 'fausse' END;
 END IF;
 IF jsonb_typeof(p_answer)='string' AND length(p_answer#>>'{}')>0 AND p_source#>>'{actuelle,reponseQRC}'=p_answer#>>'{}' THEN RETURN 'juste'; END IF;
 RETURN 'a_verifier';
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_statut(jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.revision_corrige_sources(p_owner uuid,p_refs jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_copies jsonb;v_sources jsonb:='[]'::jsonb;v_out jsonb;i integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.core_est_proprietaire(p_owner) THEN
  RAISE EXCEPTION 'Acces eleve refuse' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_refs) IS DISTINCT FROM 'array' OR jsonb_array_length(p_refs) NOT BETWEEN 1 AND 400 THEN
  RAISE EXCEPTION 'Identites requises, 400 questions maximum par lot' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_refs) r WHERE jsonb_typeof(r)<>'object'
  OR r->>'type' IS NULL OR r->>'type' NOT IN ('attempt','result','bilan_snapshot','bilan_future')
  OR coalesce(r->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR coalesce(r->>'question','')='')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_refs) r GROUP BY r->>'type',r->>'id',r->>'question' HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Identite invalide ou dupliquee' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_refs) r WHERE
  (r->>'type'='attempt' AND NOT EXISTS(SELECT 1 FROM public.exam_attempts_v2 t WHERE t.attempt_id=(r->>'id')::uuid AND t.apprenant_id=p_owner))
  OR (r->>'type'='result' AND NOT EXISTS(SELECT 1 FROM public.apprenant_quiz_results t WHERE t.id=(r->>'id')::uuid AND t.apprenant_id=p_owner))
  OR (r->>'type'='bilan_snapshot' AND NOT EXISTS(SELECT 1 FROM public.bilan_passage_snapshots t WHERE t.id=(r->>'id')::uuid AND t.apprenant_id=p_owner))
  OR (r->>'type'='bilan_future' AND NOT EXISTS(SELECT 1 FROM public.bilan_future_receipts t JOIN public.apprenants a ON a.id=p_owner
     WHERE t.id=(r->>'id')::uuid AND t.owner_id=a.auth_user_id))) THEN
  RAISE EXCEPTION 'Copie autre eleve' USING ERRCODE='42501'; END IF;
 SELECT jsonb_agg(DISTINCT jsonb_build_object('type',r->>'type','id',r->>'id')) INTO v_copies FROM jsonb_array_elements(p_refs) r;
 -- Bounded resolver calls, 50 copies at a time, never truncated.
 WHILE i < jsonb_array_length(v_copies) LOOP
  v_sources:=v_sources||public.corriges_sources_v2((SELECT jsonb_agg(x) FROM jsonb_array_elements(v_copies) WITH ORDINALITY y(x,n) WHERE n>i AND n<=i+50));
  i:=i+50;
 END LOOP;
 SELECT jsonb_agg(s ORDER BY r->>'type',r->>'id',(s->>'position')::int,r->>'question') INTO v_out
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
DECLARE s public.revision_corrige_sessions;v_sources jsonb;v_answers jsonb;v_saved jsonb;v_seq bigint;v_finished jsonb;
BEGIN
 SELECT * INTO s FROM public.revision_corrige_sessions WHERE id=p_session;
 IF s.id IS NULL OR auth.uid() IS NULL OR NOT public.core_est_proprietaire(s.owner_id) THEN
  RAISE EXCEPTION 'Acces eleve refuse' USING ERRCODE='42501'; END IF;
 v_sources:=public.revision_corrige_sources(s.owner_id,s.refs);
 SELECT coalesce(max(seq),0) INTO v_seq FROM public.revision_corrige_events WHERE session_id=s.id;
 SELECT coalesce(jsonb_object_agg(k,payload->'answer'),'{}'::jsonb),
  coalesce(jsonb_object_agg(k,jsonb_build_object('seq',seq,'saved_at',created_at,'statut',payload->'statut','corrige',payload->'corrige')),'{}'::jsonb)
 INTO v_answers,v_saved FROM (
  SELECT DISTINCT ON (payload->>'key') payload->>'key' k,payload,seq,created_at FROM public.revision_corrige_events
  WHERE session_id=s.id AND payload->>'kind'='answer' ORDER BY payload->>'key',seq DESC) a;
 SELECT payload - 'command' - 'sources' || jsonb_build_object('submitted_at',created_at) INTO v_finished
 FROM public.revision_corrige_events WHERE session_id=s.id AND payload->>'kind'='submit' ORDER BY seq DESC LIMIT 1;
 RETURN jsonb_build_object('id',s.id,'owner_id',s.owner_id,'seq',v_seq,'sources',v_sources,
 'epoch',md5(v_sources::text),'answers',v_answers,'saved',v_saved,'submission',v_finished);
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_etat(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_etat(uuid) TO authenticated;

CREATE FUNCTION public.revision_corrige_ouvrir(p_owner uuid,p_refs jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;v_refs jsonb;
BEGIN
 PERFORM public.revision_corrige_sources(p_owner,p_refs);
 -- Canonical order: two tabs sending the same set in another order resume the same session.
 SELECT jsonb_agg(jsonb_build_object('type',r->>'type','id',r->>'id','question',r->>'question') ORDER BY r->>'type',r->>'id',r->>'question')
 INTO v_refs FROM jsonb_array_elements(p_refs) r;
 PERFORM pg_advisory_xact_lock(hashtextextended('revision-corrige:'||p_owner::text||':'||md5(v_refs::text),0));
 SELECT s.id INTO v_id FROM public.revision_corrige_sessions s WHERE s.owner_id=p_owner AND s.refs=v_refs
 AND NOT EXISTS(SELECT 1 FROM public.revision_corrige_events e WHERE e.session_id=s.id AND e.payload->>'kind'='submit')
 ORDER BY s.created_at DESC,s.id DESC LIMIT 1;
 IF v_id IS NOT NULL THEN RETURN public.revision_corrige_etat(v_id); END IF;
 INSERT INTO public.revision_corrige_sessions(owner_id,refs) VALUES(p_owner,v_refs) RETURNING id INTO v_id;
 RETURN public.revision_corrige_etat(v_id);
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_ouvrir(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_ouvrir(uuid,jsonb) TO authenticated;

CREATE FUNCTION public.revision_corrige_commande(p_session uuid,p_seq bigint,p_epoch text,p_operation uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.revision_corrige_sessions;v_state jsonb;v_old jsonb;v_source jsonb;v_answers jsonb;v_answer jsonb;
 v_statut text;v_perfect integer:=0;v_pending integer:=0;v_count integer:=0;v_payload jsonb;
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
 -- Lock every authoritative official source against concurrent publication/edition during the command.
 PERFORM 1 FROM public.exam_content_versions v WHERE v.statut='publiee' AND v.retired_at IS NULL
 AND v.exam_id IN (SELECT t.exam_id FROM public.exam_attempts_v2 t JOIN jsonb_array_elements(s.refs) r ON r->>'type'='attempt' AND t.attempt_id=(r->>'id')::uuid
 UNION SELECT t.quiz_id FROM public.apprenant_quiz_results t JOIN jsonb_array_elements(s.refs) r ON r->>'type'='result' AND t.id=(r->>'id')::uuid) ORDER BY v.id FOR SHARE;
 PERFORM 1 FROM public.module_editor_state m WHERE m.module_id IN (SELECT t.module_id FROM public.bilan_passage_snapshots t
  JOIN jsonb_array_elements(s.refs) r ON r->>'type'='bilan_snapshot' AND t.id=(r->>'id')::uuid) ORDER BY m.module_id FOR SHARE;
 PERFORM 1 FROM public.bilan_future_active a WHERE a.subject IN (SELECT v.subject FROM public.bilan_future_receipts t
  JOIN public.bilan_future_versions v ON v.id=t.version_id JOIN jsonb_array_elements(s.refs) r ON r->>'type'='bilan_future' AND t.id=(r->>'id')::uuid)
  ORDER BY a.subject FOR SHARE;
 v_state:=public.revision_corrige_etat(s.id);
 IF v_state->'submission' <> 'null'::jsonb THEN RAISE EXCEPTION 'Revision deja remise' USING ERRCODE='P0554'; END IF;
 IF (v_state->>'seq')::bigint IS DISTINCT FROM p_seq THEN RAISE EXCEPTION 'Conflit de version, relire sans ecraser votre saisie' USING ERRCODE='P0555'; END IF;
 IF v_state->>'epoch' IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'Corrige modifie, relire et verifier vos reponses' USING ERRCODE='P0556'; END IF;
 IF p_payload->>'kind'='answer' THEN
  SELECT x INTO v_source FROM jsonb_array_elements(v_state->'sources') x
   WHERE (x->>'source_type')||'|'||(x->>'source_id')||'|'||(x->>'question_id')=p_payload->>'key';
  IF v_source IS NULL OR NOT(p_payload ? 'answer') OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>3 THEN
   RAISE EXCEPTION 'Question et reponse requises' USING ERRCODE='22023'; END IF;
  IF (v_source#>>'{actuelle,type}'='QCM' AND jsonb_typeof(p_payload->'answer') IS DISTINCT FROM 'array') OR
   (v_source#>>'{actuelle,type}'='QRC' AND (jsonb_typeof(p_payload->'answer') IS DISTINCT FROM 'string' OR length(p_payload->>'answer')>20000)) THEN
   RAISE EXCEPTION 'Type de reponse invalide' USING ERRCODE='22023'; END IF;
  IF v_source#>>'{actuelle,type}'='QCM' AND (EXISTS(
    SELECT 1 FROM jsonb_array_elements(p_payload->'answer') c WHERE jsonb_typeof(c)<>'string'
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_source#>'{actuelle,choix}') o WHERE o->>'lettre'=c#>>'{}'))
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'answer') c GROUP BY c HAVING count(*)>1)) THEN
   RAISE EXCEPTION 'Choix inconnu ou duplique' USING ERRCODE='22023'; END IF;
  v_payload:=p_payload||jsonb_build_object('statut',public.revision_corrige_statut(v_source,p_payload->'answer'),
   'corrige',jsonb_build_object('version',v_source->'version','provenance',v_source->'provenance',
    'bonnes',CASE WHEN v_source#>>'{actuelle,type}'='QCM' THEN (SELECT coalesce(jsonb_agg(c->>'lettre' ORDER BY c->>'lettre'),'[]'::jsonb)
      FROM jsonb_array_elements(v_source#>'{actuelle,choix}') c WHERE c->>'correct'='true') ELSE v_source#>'{actuelle,reponseQRC}' END));
 ELSIF p_payload->>'kind'='submit' AND p_payload='{"kind":"submit"}'::jsonb THEN
  v_answers:=v_state->'answers';
  FOR v_source IN SELECT x FROM jsonb_array_elements(v_state->'sources') x LOOP
   v_answer:=v_answers->((v_source->>'source_type')||'|'||(v_source->>'source_id')||'|'||(v_source->>'question_id'));
   IF v_answer IS NULL OR v_answer='null'::jsonb OR v_answer='[]'::jsonb OR v_answer='""'::jsonb THEN
    RAISE EXCEPTION 'Toutes les reponses doivent etre sauvegardees' USING ERRCODE='P0557'; END IF;
   v_count:=v_count+1;
   v_statut:=public.revision_corrige_statut(v_source,v_answer);
   IF v_statut='juste' THEN v_perfect:=v_perfect+1; ELSIF v_statut='a_verifier' THEN v_pending:=v_pending+1; END IF;
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

-- Admin reader: cursor of 20 sessions, latest saved answer per question with the official version used,
-- number of saves, and validation state. Initial answers and current key come from corriges_sources_v2.
CREATE FUNCTION public.revision_corrige_admin(p_owner uuid,p_after uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_out jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
  RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 WITH sessions AS MATERIALIZED (
  SELECT * FROM public.revision_corrige_sessions WHERE owner_id=p_owner AND (p_after IS NULL OR id>p_after) ORDER BY id LIMIT 20
 ), latest AS (
  SELECT DISTINCT ON(e.session_id,e.payload->>'key') e.session_id,e.seq,e.created_at,e.payload,
   count(*) OVER (PARTITION BY e.session_id,e.payload->>'key') nb
  FROM public.revision_corrige_events e JOIN sessions s ON s.id=e.session_id
  WHERE e.payload->>'kind'='answer' ORDER BY e.session_id,e.payload->>'key',e.seq DESC
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('session_id',s.id,'owner_id',s.owner_id,'refs',s.refs,'created_at',s.created_at,
  'submission',(SELECT e.payload - 'command' - 'sources' - 'answers' || jsonb_build_object('submitted_at',e.created_at,'seq',e.seq)
    FROM public.revision_corrige_events e WHERE e.session_id=s.id AND e.payload->>'kind'='submit' ORDER BY e.seq DESC LIMIT 1),
  'answers',coalesce((SELECT jsonb_agg(jsonb_build_object('key',e.payload->>'key','answer',e.payload->'answer','saved_at',e.created_at,
    'seq',e.seq,'statut',e.payload->'statut','corrige',e.payload->'corrige','nb_sauvegardes',e.nb) ORDER BY e.payload->>'key')
   FROM latest e WHERE e.session_id=s.id),'[]'::jsonb)) ORDER BY s.id),'[]'::jsonb)
 INTO v_out FROM sessions s;
 RETURN v_out;
END; $$;
REVOKE ALL ON FUNCTION public.revision_corrige_admin(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revision_corrige_admin(uuid,uuid) TO authenticated;

-- Admin coverage audit: keyset pages of at most 50 copies per circuit, read-only.
CREATE FUNCTION public.corriges_couverture_admin(p_type text,p_after uuid DEFAULT NULL,p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ids uuid[];v_rows jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
  RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 IF p_limit NOT BETWEEN 1 AND 50 OR p_type NOT IN ('attempt','result','bilan_snapshot','bilan_future') THEN
  RAISE EXCEPTION 'Parametres invalides' USING ERRCODE='22023'; END IF;
 IF p_type='attempt' THEN SELECT array_agg(id ORDER BY id) INTO v_ids FROM (SELECT attempt_id id FROM public.exam_attempts_v2
   WHERE etat='terminee' AND is_test IS NOT TRUE AND (p_after IS NULL OR attempt_id>p_after) ORDER BY attempt_id LIMIT p_limit) x;
 ELSIF p_type='result' THEN SELECT array_agg(id ORDER BY id) INTO v_ids FROM (SELECT id FROM public.apprenant_quiz_results
   WHERE quiz_type='examen_blanc' AND completed_at IS NOT NULL AND (p_after IS NULL OR id>p_after) ORDER BY id LIMIT p_limit) x;
 ELSIF p_type='bilan_snapshot' THEN SELECT array_agg(id ORDER BY id) INTO v_ids FROM (SELECT id FROM public.bilan_passage_snapshots
   WHERE (p_after IS NULL OR id>p_after) ORDER BY id LIMIT p_limit) x;
 ELSE SELECT array_agg(id ORDER BY id) INTO v_ids FROM (SELECT r.id FROM public.bilan_future_receipts r
   JOIN public.bilan_future_submissions s ON s.receipt_id=r.id WHERE (p_after IS NULL OR r.id>p_after) ORDER BY r.id LIMIT p_limit) x;
 END IF;
 IF v_ids IS NULL THEN RETURN jsonb_build_object('items','[]'::jsonb,'next',NULL); END IF;
 v_rows:=public.corriges_sources_v2((SELECT jsonb_agg(jsonb_build_object('type',p_type,'id',i)) FROM unnest(v_ids) i));
 RETURN jsonb_build_object('next',CASE WHEN cardinality(v_ids)=p_limit THEN v_ids[cardinality(v_ids)] END,
  'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('source_id',i,
   'exam_id',(SELECT x->>'exam_id' FROM jsonb_array_elements(v_rows) x WHERE x->>'source_id'=i::text LIMIT 1),
   'questions',(SELECT count(*) FROM jsonb_array_elements(v_rows) x WHERE x->>'source_id'=i::text AND x->>'question_id' IS NOT NULL),
   'rapprochees',(SELECT count(*) FROM jsonb_array_elements(v_rows) x WHERE x->>'source_id'=i::text AND x->>'statut'='rapproche'),
   'raisons',(SELECT coalesce(jsonb_object_agg(r,n),'{}'::jsonb) FROM (SELECT x->>'raison' r,count(*) n FROM jsonb_array_elements(v_rows) x
     WHERE x->>'source_id'=i::text AND x->>'raison' IS NOT NULL GROUP BY 1) q)) ORDER BY i),'[]'::jsonb) FROM unnest(v_ids) i));
END; $$;
REVOKE ALL ON FUNCTION public.corriges_couverture_admin(text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.corriges_couverture_admin(text,uuid,integer) TO authenticated;
