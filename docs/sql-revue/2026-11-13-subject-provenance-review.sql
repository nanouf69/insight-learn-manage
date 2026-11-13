-- ISOLATED CANDIDATE ONLY. No automatic legacy/native association or historical mutation.
CREATE TABLE public.exam_subject_provenance_reviews (
 operation_id uuid PRIMARY KEY, apprenant_id uuid NOT NULL, exam_id text NOT NULL,
 matiere_id text NOT NULL, selected_attempt_id uuid NOT NULL, scope_hash text NOT NULL,
 version_hash text NOT NULL, motif text NOT NULL CHECK(length(trim(motif))>=10),
 actor uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exam_subject_provenance_reviews TO authenticated;
GRANT ALL ON public.exam_subject_provenance_reviews TO service_role;
ALTER TABLE public.exam_subject_provenance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviewed_scope_read ON public.exam_subject_provenance_reviews FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'admin') OR public.core_est_proprietaire(apprenant_id));
CREATE TRIGGER review_immutable BEFORE UPDATE OR DELETE ON public.exam_subject_provenance_reviews
 FOR EACH ROW EXECUTE FUNCTION public.exam_subject_retake_immutable();

CREATE FUNCTION public.exam_subject_provenance_read(p_owner uuid,p_exam text,p_subject text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE scope jsonb; version_hash text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administration requise' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
  'attempts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.attempt_id,'version',a.exam_version_id,
    'start',a.started_at,'end',a.finished_at,'state',a.etat,'hash',md5(to_jsonb(a)::text),
    'answers_hash',(SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'|' ORDER BY s.response_id),'')) FROM answer_state s WHERE s.attempt_id=a.attempt_id),
    'result_hash',(SELECT md5(coalesce(string_agg(to_jsonb(r)::text,'|' ORDER BY r.result_id),'')) FROM core_exam_results r WHERE r.attempt_id=a.attempt_id)) ORDER BY a.attempt_id)
    FROM exam_attempts_v2 a WHERE a.apprenant_id=p_owner AND a.exam_id=p_exam AND a.snapshot->>'matiere'=p_subject),'[]'),
  'legacy',coalesce((SELECT jsonb_agg(jsonb_build_object('id',q.id,'tentative',q.tentative,'end',q.completed_at,'hash',md5(to_jsonb(q)::text)) ORDER BY q.id)
    FROM apprenant_quiz_results q WHERE q.apprenant_id=p_owner AND q.quiz_id=p_exam AND q.matiere_id=p_subject AND q.quiz_type='examen_blanc'),'[]'),
  'projections',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'key',r.exercice_id,'tentative',r.tentative,'seq',r.write_seq,'hash',md5(to_jsonb(r)::text)) ORDER BY r.id)
    FROM reponses_apprenants r WHERE r.apprenant_id=p_owner AND r.exercice_type='examen_blanc' AND split_part(r.exercice_id,'__',1)=p_exam AND split_part(r.exercice_id,'__',2)=p_subject),'[]')
 ) INTO scope;
 SELECT md5(to_jsonb(v)::text) INTO version_hash FROM exam_content_versions v WHERE exam_id=p_exam AND statut='publiee' ORDER BY version_number DESC LIMIT 1;
 RETURN jsonb_build_object('owner',p_owner,'exam',p_exam,'subject',p_subject,'scope',scope,'scope_hash',md5(scope::text),'version_hash',version_hash);
END $$;
REVOKE ALL ON FUNCTION public.exam_subject_provenance_read(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.exam_subject_provenance_read(uuid,text,text) TO authenticated,service_role;

-- Decision authorizes only a new subject copy after explicit selection, not a claim that a legacy result belongs to it.
CREATE FUNCTION public.exam_subject_provenance_decide(p_operation uuid,p_owner uuid,p_exam text,p_subject text,p_attempt uuid,p_scope text,p_version text,p_motif text)
RETURNS public.exam_subject_provenance_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; r public.exam_subject_provenance_reviews; a public.exam_attempts_v2;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administration requise' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('subject-retake:'||p_owner||':'||p_exam,0));
 SELECT * INTO r FROM exam_subject_provenance_reviews WHERE operation_id=p_operation;
 IF FOUND THEN
  IF (r.apprenant_id,r.exam_id,r.matiere_id,r.selected_attempt_id,r.scope_hash,r.version_hash,r.motif) IS DISTINCT FROM (p_owner,p_exam,p_subject,p_attempt,p_scope,p_version,p_motif) THEN
   RAISE EXCEPTION 'Opération différente' USING ERRCODE='P0482'; END IF;
  RETURN r;
 END IF;
 c:=exam_subject_provenance_read(p_owner,p_exam,p_subject);
 IF c->>'scope_hash' IS DISTINCT FROM p_scope OR c->>'version_hash' IS DISTINCT FROM p_version OR p_version IS NULL THEN
  RAISE EXCEPTION 'Preuves modifiées ; relire' USING ERRCODE='P0482'; END IF;
 SELECT * INTO a FROM exam_attempts_v2 WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.apprenant_id<>p_owner OR a.exam_id<>p_exam OR a.snapshot->>'matiere' IS DISTINCT FROM p_subject
  OR a.etat<>'terminee' OR a.finished_at IS NULL THEN RAISE EXCEPTION 'Copie fermée exacte requise' USING ERRCODE='P0482'; END IF;
 IF EXISTS(SELECT 1 FROM exam_attempts_v2 WHERE apprenant_id=p_owner AND exam_id=p_exam AND snapshot->>'matiere'=p_subject AND etat='en_cours') THEN
  RAISE EXCEPTION 'Copie en cours ; reprise requise' USING ERRCODE='P0478'; END IF;
 INSERT INTO exam_subject_provenance_reviews VALUES(p_operation,p_owner,p_exam,p_subject,p_attempt,p_scope,p_version,p_motif,auth.uid(),now()) RETURNING * INTO r;
 INSERT INTO audit_journal(operation,cible_type,cible_id,exam_id,attempt_id,apprenant_id,auteur,apres,origine)
 VALUES('subject_provenance_review','exam_subject_provenance_reviews',r.operation_id::text,p_exam,p_attempt,p_owner,auth.uid(),jsonb_build_object('decision',to_jsonb(r),'scope',c->'scope','association_legacy',false),'admin_explicit_review');
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.exam_subject_provenance_decide(uuid,uuid,text,text,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.exam_subject_provenance_decide(uuid,uuid,text,text,uuid,text,text,text) TO authenticated,service_role;

-- Starter intentionally fail-closed until all learner readers/retake receipts use this reviewed identity.
-- A recorded review is NOT an installed reset authorization.
CREATE FUNCTION public.exam_subject_provenance_start(p_operation uuid,p_review uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Préparation isolée : démarrage non activé' USING ERRCODE='P0482'; END $$;
REVOKE ALL ON FUNCTION public.exam_subject_provenance_start(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.exam_subject_provenance_start(uuid,uuid) TO authenticated,service_role;