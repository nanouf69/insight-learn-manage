-- TEST ONLY: requires synthetic local source tables. Never an active migration.
CREATE TABLE public.qrc_history_events (
 event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id text UNIQUE NOT NULL,
 source_result_id uuid NOT NULL REFERENCES public.apprenant_quiz_results(id),
 question_id text NOT NULL, revision integer NOT NULL CHECK(revision>0),
 note numeric NOT NULL CHECK(note>=0), commentaire text NOT NULL DEFAULT '',
 actor uuid NOT NULL, evidence_fingerprint text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_result_id,question_id,revision)
);
GRANT SELECT ON public.qrc_history_events TO authenticated;
GRANT ALL ON public.qrc_history_events TO service_role;
ALTER TABLE public.qrc_history_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.qrc_history_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.qrc_history_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER history_no_rewrite BEFORE UPDATE OR DELETE ON public.qrc_history_events FOR EACH ROW EXECUTE FUNCTION public.qrc_history_append_only();

-- One row per ORIGINAL result/question identity; no import and no current course bank.
CREATE VIEW public.qrc_unified_candidate AS
WITH h AS (
 SELECT r.*, CASE WHEN jsonb_typeof(r.details->'snapshot'->'questions')='array' THEN r.details->'snapshot'->'questions'
 WHEN jsonb_typeof(r.details->'questions')='array' THEN r.details->'questions' ELSE '[]'::jsonb END questions,
 CASE WHEN r.details ? 'source_exercice_id' AND r.details ? 'source_tentative' THEN EXISTS(
 SELECT 1 FROM public.reponses_apprenants a WHERE a.apprenant_id=r.apprenant_id
 AND a.exercice_id=r.details->>'source_exercice_id' AND a.tentative::text=r.details->>'source_tentative'
 AND a.completed AND a.status='submitted' AND a.submitted_at IS NOT NULL
 AND a.submitted_at=r.completed_at AND a.reponses=r.details->'reponses') ELSE false END submitted_proof,
 (r.details->'snapshot'->'questions' IS NOT NULL AND r.details->'questions' IS NOT NULL
 AND r.details->'snapshot'->'questions' <> r.details->'questions') ambiguous
 FROM public.apprenant_quiz_results r
 WHERE r.quiz_id ~* '^eb[1-6]($|-(taxi|ta|va)$)' AND r.quiz_type='examen_blanc'
 AND NOT EXISTS(SELECT 1 FROM public.exam_attempts_v2 a
 WHERE a.snapshot->>'result_id'=r.id::text AND a.apprenant_id=r.apprenant_id AND a.exam_id=r.quiz_id
 AND a.snapshot->>'matiere'=r.matiere_id AND a.snapshot->>'tentative'=r.tentative::text
 AND a.snapshot->'source_historique'->'details'=r.details)
), projected AS (
 SELECT 'historical'::text origin,'history:'||h.id||':'||coalesce(q->>'id','missing-'||ordinality) identity,
 'history:'||h.id copy_id,h.id source_result_id,h.apprenant_id,h.quiz_id exam_id,h.matiere_id subject_id,
 q->>'id' question_id,q->>'enonce' enonce,coalesce(q->>'reponseQRC',q->>'reponse_officielle') official_answer,
 CASE WHEN coalesce(q->>'points',q->>'bareme') ~ '^[0-9]+([.][0-9]+)?$'
 THEN coalesce(q->>'points',q->>'bareme')::numeric ELSE NULL END bareme,
 h.details->'reponses'->(q->>'id') reponse,h.completed_at passage_at,h.tentative,
 CASE WHEN NOT h.submitted_proof THEN 'remise_non_prouvee'
 WHEN h.ambiguous THEN 'snapshot_ambigu'
 WHEN EXISTS(SELECT 1 FROM public.exam_attempts_v2 a
 WHERE coalesce(a.snapshot->'source_historique'->>'result_id',a.snapshot->>'result_id')=h.id::text) THEN 'lien_natif_a_verifier'
 WHEN h.details->'correctionsIA' ? (q->>'id')
 OR h.details->'correctionsQRC' ? (q->>'id')
 OR h.details->'notesQRC' ? (q->>'id')
 OR h.details->'qrc_pending_correction'='false'::jsonb THEN 'correction_existante_a_preserver'
 WHEN q->>'id' IS NULL THEN 'identite_absente'
 WHEN (SELECT count(*) FROM jsonb_array_elements(h.questions) d WHERE d->>'id'=q->>'id')<>1 THEN 'identite_ambigue'
 WHEN EXISTS(SELECT 1 FROM public.apprenant_quiz_results other WHERE other.id<>h.id
 AND other.apprenant_id=h.apprenant_id AND other.quiz_id=h.quiz_id AND other.matiere_id=h.matiere_id
 AND other.tentative=h.tentative) THEN 'passage_ambigu'
 WHEN NOT (coalesce(q->>'points',q->>'bareme','') ~ '^[0-9]+([.][0-9]+)?$') THEN 'bareme_absent'
 WHEN coalesce(q->>'points',q->>'bareme')::numeric<=0 THEN 'bareme_invalide'
 WHEN nullif(btrim(coalesce(q->>'reponseQRC',q->>'reponse_officielle','')),'') IS NULL THEN 'corrige_absent'
 ELSE NULL END issue,
 md5(jsonb_build_array(h.id,h.apprenant_id,h.quiz_id,h.matiere_id,h.tentative,h.details)::text) fingerprint,
 NULL::numeric original_note, 'en_attente'::text original_state
 FROM h CROSS JOIN LATERAL jsonb_array_elements(h.questions) WITH ORDINALITY j(q,ordinality)
 WHERE upper(q->>'type')='QRC'
 UNION ALL
 SELECT 'native','native:'||i.qrc_instance_id,a.attempt_id::text,NULL::uuid,a.apprenant_id,a.exam_id,
 coalesce(q->>'matiere',a.snapshot->>'matiere'),i.question_id,q->>'enonce',q->>'reponseQRC',
 CASE WHEN (q->>'points') ~ '^[0-9]+([.][0-9]+)?$' THEN (q->>'points')::numeric END,
 i.reponse,coalesce(a.finished_at,a.started_at),coalesce((a.snapshot->>'tentative')::integer,1),
 CASE WHEN a.etat<>'terminee' OR a.finished_at IS NULL THEN 'en_cours'
 WHEN q IS NULL THEN 'snapshot_absent' WHEN (q->>'points') IS NULL THEN 'bareme_absent' ELSE NULL END,
 a.snapshot_fingerprint,i.note,i.etat
 FROM public.exam_attempts_v2 a JOIN public.qrc_instances_v2 i USING(attempt_id)
 LEFT JOIN LATERAL (SELECT value q FROM jsonb_array_elements(coalesce(a.snapshot->'questions','[]'))
 WHERE value->>'id'=i.question_id LIMIT 1) j ON true
 WHERE a.exam_id ~* '^eb[1-6]($|-(taxi|ta|va)$)'
)
SELECT p.*,coalesce(e.revision,0) revision,coalesce(e.note,p.original_note) note,
 CASE WHEN e.event_id IS NOT NULL THEN 'corrigee' ELSE p.original_state END etat,
 e.actor,e.commentaire,
 coalesce((SELECT jsonb_agg(DISTINCT sa.session_id ORDER BY sa.session_id) FROM public.session_apprenants sa
 JOIN public.sessions s ON s.id=sa.session_id WHERE sa.apprenant_id=p.apprenant_id
 AND (p.passage_at AT TIME ZONE 'Europe/Paris')::date BETWEEN coalesce(sa.date_debut,s.date_debut) AND coalesce(sa.date_fin,s.date_fin)), '[]'::jsonb) session_ids
FROM projected p LEFT JOIN LATERAL (SELECT * FROM public.qrc_history_events ev
 WHERE ev.source_result_id=p.source_result_id AND ev.question_id=p.question_id ORDER BY revision DESC LIMIT 1) e ON true;
-- View access exclusively through admin-gated functions (never a direct public view grant).
REVOKE ALL ON public.qrc_unified_candidate FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.qrc_unified_read(p_after text DEFAULT '',p_limit integer DEFAULT 500,p_session uuid DEFAULT NULL,p_exam text DEFAULT NULL)
RETURNS SETOF public.qrc_unified_candidate LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
 IF p_limit<1 OR p_limit>1000 THEN RAISE EXCEPTION 'page limit'; END IF;
 RETURN QUERY SELECT * FROM public.qrc_unified_candidate v WHERE v.identity>p_after
 AND (p_session IS NULL OR v.session_ids ? p_session::text)
 AND (p_exam IS NULL OR v.exam_id=p_exam) ORDER BY v.identity LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.qrc_unified_read(text,integer,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qrc_unified_read(text,integer,uuid,text) TO authenticated;

CREATE FUNCTION public.qrc_history_grade(p_operation text,p_identity text,p_expected_revision integer,
 p_fingerprint text,p_note numeric,p_commentaire text DEFAULT '') RETURNS public.qrc_history_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.qrc_unified_candidate; prior public.qrc_history_events; result public.qrc_history_events;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501'; END IF;
 IF nullif(btrim(p_operation),'') IS NULL OR p_note IS NULL OR p_commentaire IS NULL THEN RAISE EXCEPTION 'invalid command'; END IF;
 -- Serialize BOTH operation IDs and QRC identity, regardless of device.
 PERFORM pg_advisory_xact_lock(hashtextextended('op:'||p_operation,0));
 SELECT * INTO prior FROM public.qrc_history_events WHERE operation_id=p_operation;
 IF FOUND THEN
 IF prior.actor<>auth.uid() OR 'history:'||prior.source_result_id||':'||prior.question_id<>p_identity
 OR prior.note<>p_note OR prior.commentaire<>p_commentaire OR prior.evidence_fingerprint<>p_fingerprint THEN
 RAISE EXCEPTION 'operation conflict' USING ERRCODE='40001'; END IF;
 RETURN prior;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('qrc:'||p_identity,0));
 -- Hold the ORIGINAL source row against concurrent source edits until commit.
 PERFORM 1 FROM public.apprenant_quiz_results r
 WHERE 'history:'||r.id||':'||split_part(p_identity,':',3)=p_identity FOR UPDATE;
 SELECT * INTO v FROM public.qrc_unified_candidate WHERE identity=p_identity;
 IF NOT FOUND OR v.origin<>'historical' THEN RAISE EXCEPTION 'historical identity required'; END IF;
 IF v.issue IS NOT NULL THEN RAISE EXCEPTION 'proof refused: %',v.issue; END IF;
 IF v.revision<>p_expected_revision OR v.fingerprint<>p_fingerprint THEN RAISE EXCEPTION 'stale proof' USING ERRCODE='40001'; END IF;
 IF p_note<0 OR p_note>v.bareme THEN RAISE EXCEPTION 'grade out of range'; END IF;
 INSERT INTO public.qrc_history_events(operation_id,source_result_id,question_id,revision,note,commentaire,actor,evidence_fingerprint)
 VALUES(p_operation,v.source_result_id,v.question_id,v.revision+1,p_note,p_commentaire,auth.uid(),v.fingerprint) RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.qrc_history_grade(text,text,integer,text,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qrc_history_grade(text,text,integer,text,numeric,text) TO authenticated;
