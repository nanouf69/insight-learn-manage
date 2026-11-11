-- PREPARATION ONLY: apply ONLY in a disposable database after cancellation base.
-- No live installation. Coverage gate remains false until separately approved.
DO $integration$
DECLARE f record; definition text;
BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('core_start_attempt','start_exam_subject_retake','core_restart_matiere','core_finalize_attempt',
 'admin_authorize_exam_subject_reset','exam_subject_reset_expired_empty','enforce_exam_retake_delay',
 'start_or_get_exam_timer') AND p.prokind='f' LOOP
 definition:=pg_get_functiondef(f.oid);
 -- Replace READ sources only; writes and rowtype contracts remain original.
 definition:=regexp_replace(definition,'((FROM|JOIN)[[:space:]]+)(public\.)?core_tentatives_neutralisees\y','\1public.core_exam_neutralisations_effective','gi');
 definition:=regexp_replace(definition,'((FROM|JOIN)[[:space:]]+)(public\.)?core_exam_resets\y','\1public.core_exam_resets_effective','gi');
 definition:=regexp_replace(definition,'((FROM|JOIN)[[:space:]]+)(public\.)?exam_retake_authorizations\y','\1public.exam_retake_authorizations_effective','gi');
 IF f.proname IN ('start_exam_subject_retake','admin_authorize_exam_subject_reset') THEN
  -- Same order as cancellation: exam-v2 BEFORE subject-retake, never opposite.
  definition:=regexp_replace(definition,'\yBEGIN\y',E'BEGIN\n PERFORM pg_advisory_xact_lock(hashtextextended(''exam-v2:''||p_apprenant_id::text||'':''||p_exam_id,0));','i');
 ELSIF f.proname='start_or_get_exam_timer' THEN
  definition:=regexp_replace(definition,'\yBEGIN\y',E'BEGIN\n PERFORM pg_advisory_xact_lock(hashtextextended(''exam-v2:''||_apprenant_id::text||'':''||split_part(_exercice_id,''__'',1),0));','i');
 END IF;
 EXECUTE definition;
 END LOOP;
END $integration$;

-- Paid AI eligibility retains raw archive exclusions: cancellation never requeues a historical copy.

-- Legacy direct inserts share the lock even when not called through timer RPC.
CREATE FUNCTION public.exam_reset_cancel_legacy_lock() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE exam text;
BEGIN
 IF TG_TABLE_NAME='apprenant_quiz_results' THEN exam:=NEW.quiz_id;
 ELSIF TG_TABLE_NAME='exam_subject_retakes' THEN exam:=NEW.exam_id;
 ELSE exam:=split_part(NEW.exercice_id,'__',1); END IF;
 IF exam ~* '^EB[1-6](-TAXI|-ta|-va)?$' THEN
 PERFORM pg_advisory_xact_lock(hashtextextended('exam-v2:'||NEW.apprenant_id::text||':'||exam,0));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_reset_cancel_legacy_timer BEFORE INSERT ON public.apprenant_examen_timers
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancel_legacy_lock();
CREATE TRIGGER aa_reset_cancel_legacy_answer BEFORE INSERT ON public.reponses_apprenants
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancel_legacy_lock();
CREATE TRIGGER aa_reset_cancel_legacy_result BEFORE INSERT ON public.apprenant_quiz_results
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancel_legacy_lock();
CREATE TRIGGER aa_reset_cancel_legacy_retake BEFORE INSERT ON public.exam_subject_retakes
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancel_legacy_lock();
REVOKE ALL ON FUNCTION public.exam_reset_cancel_legacy_lock() FROM PUBLIC,anon,authenticated;

-- Add further legacy provenance checks while preserving the existing context.
ALTER FUNCTION public.admin_exam_reset_cancel_context(uuid,uuid) RENAME TO admin_exam_reset_cancel_context_v1;
REVOKE ALL ON FUNCTION public.admin_exam_reset_cancel_context_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.admin_exam_reset_cancel_context(p_apprenant_id uuid,p_reset_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; r public.core_exam_resets; reason text;
BEGIN
 c:=public.admin_exam_reset_cancel_context_v1(p_apprenant_id,p_reset_id);
 SELECT * INTO r FROM public.core_exam_resets WHERE reset_id=p_reset_id;
 IF NOT (c->>'eligible')::boolean THEN RETURN c; END IF;
 IF EXISTS(SELECT 1 FROM public.apprenant_examen_timers t WHERE t.apprenant_id=r.apprenant_id
 AND split_part(t.exercice_id,'__',1)=r.exam_id AND t.started_at>=r.cutoff_at) THEN reason:='Un nouveau chronomètre ancien a commencé.';
 ELSIF EXISTS(SELECT 1 FROM public.reponses_apprenants a WHERE a.apprenant_id=r.apprenant_id
 AND split_part(a.exercice_id,'__',1)=r.exam_id AND a.created_at>=r.cutoff_at) THEN reason:='Une nouvelle réponse ancienne existe.';
 ELSIF EXISTS(SELECT 1 FROM public.exam_subject_retakes a WHERE a.apprenant_id=r.apprenant_id
 AND a.exam_id=r.exam_id AND a.created_at>=r.cutoff_at) THEN reason:='Un repassage matière a commencé.';
 ELSIF EXISTS(SELECT 1 FROM public.exam_subject_reset_authorizations a JOIN public.exam_subject_retakes t ON t.authorization_id=a.operation_id
 WHERE a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id AND t.created_at>=r.cutoff_at) THEN reason:='Une autorisation matière a été consommée.';
 END IF;
 IF reason IS NOT NULL THEN c:=c||jsonb_build_object('eligible',false,'reason',reason); END IF;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.admin_exam_reset_cancel_context(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_exam_reset_cancel_context(uuid,uuid) TO authenticated;