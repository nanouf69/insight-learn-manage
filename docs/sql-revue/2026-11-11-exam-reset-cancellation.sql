-- PREPARATION ONLY. Do not install: existing raw reset/neutralisation readers
-- and all legacy starter locks must be converted and validated together first.
CREATE TABLE public.core_exam_reset_cancellations (
  cancellation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL UNIQUE,
  reset_id uuid NOT NULL UNIQUE REFERENCES public.core_exam_resets(reset_id),
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  actor uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.core_exam_reset_cancellations TO authenticated;
GRANT ALL ON public.core_exam_reset_cancellations TO service_role;
ALTER TABLE public.core_exam_reset_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY cancellation_read ON public.core_exam_reset_cancellations FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'admin') OR EXISTS (
   SELECT 1 FROM public.apprenants a WHERE a.id=apprenant_id AND a.auth_user_id=auth.uid()));

CREATE FUNCTION public.exam_reset_cancellation_immutable() RETURNS trigger
 LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'CANCELLATION_APPEND_ONLY' USING ERRCODE='P0552'; END $$;
CREATE TRIGGER cancellation_immutable BEFORE UPDATE OR DELETE ON public.core_exam_reset_cancellations
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancellation_immutable();

CREATE VIEW public.core_exam_resets_effective WITH (security_invoker=true) AS
 SELECT r.* FROM public.core_exam_resets r WHERE NOT EXISTS (
 SELECT 1 FROM public.core_exam_reset_cancellations c WHERE c.reset_id=r.reset_id);
GRANT SELECT ON public.core_exam_resets_effective TO authenticated,service_role;
CREATE VIEW public.core_exam_neutralisations_effective WITH (security_invoker=true) AS
 SELECT n.* FROM public.core_tentatives_neutralisees n WHERE NOT EXISTS (
 SELECT 1 FROM public.core_exam_reset_cancellations c JOIN public.core_exam_resets r ON r.reset_id=c.reset_id
 WHERE n.apprenant_id=r.apprenant_id AND n.exam_id=r.exam_id
 AND r.archived_attempt_ids ? n.attempt_id::text
 AND n.motif='Archive par remise a zero administrative '||r.reset_id::text);
GRANT SELECT ON public.core_exam_neutralisations_effective TO authenticated,service_role;
CREATE VIEW public.exam_retake_authorizations_effective WITH (security_invoker=true) AS
 SELECT a.* FROM public.exam_retake_authorizations a WHERE NOT EXISTS (
 SELECT 1 FROM public.core_exam_reset_cancellations c WHERE c.reset_id=a.reset_id);
GRANT SELECT ON public.exam_retake_authorizations_effective TO authenticated,service_role;

-- This gate must remain FALSE in the candidate. No UI may claim restoration.
CREATE FUNCTION public.exam_reset_cancellation_coverage_ready() RETURNS boolean
 LANGUAGE sql STABLE SET search_path=public AS $$ SELECT false $$;

CREATE FUNCTION public.admin_exam_reset_cancel_context(p_apprenant_id uuid,p_reset_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.core_exam_resets; reason text; cancelled boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
   RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.core_exam_resets WHERE reset_id=p_reset_id AND apprenant_id=p_apprenant_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'RESET_IDENTITY_MISMATCH' USING ERRCODE='P0552'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.core_exam_reset_cancellations c WHERE c.reset_id=r.reset_id) INTO cancelled;
 IF cancelled THEN reason:='Annulation déjà enregistrée.';
 ELSIF EXISTS(SELECT 1 FROM public.core_exam_resets x WHERE x.apprenant_id=r.apprenant_id AND x.exam_id=r.exam_id
   AND x.reset_id<>r.reset_id AND x.cutoff_at>=r.cutoff_at) THEN reason:='Remise à zéro non dernière ou ambiguë.';
 ELSIF EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id
   AND (a.started_at>=r.cutoff_at OR NOT (r.archived_attempt_ids ? a.attempt_id::text)))
 THEN reason:='Une nouvelle tentative a commencé.';
 ELSIF EXISTS(SELECT 1 FROM public.apprenant_quiz_results q WHERE q.apprenant_id=r.apprenant_id AND q.quiz_id=r.exam_id
   AND (q.created_at>=r.cutoff_at OR NOT (r.archived_legacy_result_ids ? q.id::text)))
 THEN reason:='Une nouvelle copie ou une provenance incertaine existe.';
 ELSIF (SELECT count(*) FROM public.exam_retake_authorizations a WHERE a.reset_id=r.reset_id
   AND a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id)<>1
 THEN reason:='Autorisation du reset absente ou ambiguë.';
 ELSIF EXISTS(SELECT 1 FROM public.exam_retake_authorizations a WHERE a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id
   AND (a.reset_id=r.reset_id OR a.created_at>=r.cutoff_at) AND (a.consumed_at IS NOT NULL OR a.revoked_at IS NOT NULL))
 THEN reason:='Autorisation consommée ou état non compatible.';
 ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements_text(r.archived_attempt_ids) id
   WHERE NOT EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.attempt_id=id::uuid
     AND a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id AND a.etat='terminee'))
 THEN reason:='Une copie archivée non terminée ou absente doit rester verrouillée.';
 ELSE reason:='Copies conservées ; annulation ciblée possible après validation complète du serveur.';
 END IF;
 RETURN jsonb_build_object('reset_id',r.reset_id,'apprenant_id',r.apprenant_id,'exam_id',r.exam_id,
   'cutoff_at',r.cutoff_at,'eligible',NOT cancelled AND reason LIKE 'Copies conservées%',
   'reason',reason,'cancelled',cancelled);
END $$;
REVOKE ALL ON FUNCTION public.admin_exam_reset_cancel_context(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_exam_reset_cancel_context(uuid,uuid) TO authenticated;

CREATE FUNCTION public.admin_cancel_exam_reset(p_operation_id uuid,p_apprenant_id uuid,p_reset_id uuid,
 p_exam_id text,p_cutoff_at timestamptz) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.core_exam_resets; c public.core_exam_reset_cancellations; context jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
   RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.core_exam_resets WHERE reset_id=p_reset_id;
 IF NOT FOUND OR r.apprenant_id<>p_apprenant_id OR r.exam_id<>p_exam_id OR r.cutoff_at<>p_cutoff_at THEN
   RAISE EXCEPTION 'RESET_IDENTITY_MISMATCH' USING ERRCODE='P0552'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('exam-v2:'||r.apprenant_id::text||':'||r.exam_id,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('subject-retake:'||r.apprenant_id::text||':'||r.exam_id,0));
 SELECT * INTO c FROM public.core_exam_reset_cancellations WHERE operation_id=p_operation_id;
 IF FOUND THEN
   IF c.reset_id<>r.reset_id OR c.apprenant_id<>p_apprenant_id THEN
     RAISE EXCEPTION 'OPERATION_IDENTITY_MISMATCH' USING ERRCODE='P0552'; END IF;
   RETURN to_jsonb(c);
 END IF;
 SELECT * INTO c FROM public.core_exam_reset_cancellations WHERE reset_id=r.reset_id;
 IF FOUND THEN RETURN to_jsonb(c); END IF;
 IF NOT public.exam_reset_cancellation_coverage_ready() THEN
   RAISE EXCEPTION 'CANCELLATION_NOT_INSTALLED: coverage unverified' USING ERRCODE='P0552'; END IF;
 -- Lock the exact grant before re-reading its consumed state.
 PERFORM 1 FROM public.exam_retake_authorizations WHERE reset_id=r.reset_id FOR UPDATE;
 context:=public.admin_exam_reset_cancel_context(p_apprenant_id,p_reset_id);
 IF NOT (context->>'eligible')::boolean THEN
   RAISE EXCEPTION '%',context->>'reason' USING ERRCODE='P0552'; END IF;
 INSERT INTO public.core_exam_reset_cancellations(operation_id,reset_id,apprenant_id,exam_id,actor,evidence)
 VALUES(p_operation_id,r.reset_id,r.apprenant_id,r.exam_id,auth.uid(),context) RETURNING * INTO c;
 INSERT INTO public.audit_journal(operation,cible_type,cible_id,exam_id,apprenant_id,auteur,avant,apres,origine)
 VALUES('exam_reset_cancel','core_exam_resets',r.reset_id::text,r.exam_id,r.apprenant_id,auth.uid(),
 to_jsonb(r),to_jsonb(c),'admin_cancel_exam_reset');
 RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.admin_cancel_exam_reset(uuid,uuid,uuid,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_exam_reset(uuid,uuid,uuid,text,timestamptz) TO authenticated;

-- Additive V2 serialization only. Legacy timer/answer/start routes remain a
-- known coverage blocker; this candidate intentionally does not claim otherwise.
CREATE FUNCTION public.exam_reset_cancel_start_lock() RETURNS trigger
 LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('exam-v2:'||NEW.apprenant_id::text||':'||NEW.exam_id,0));
 RETURN NEW;
END $$;
CREATE TRIGGER reset_cancel_start_lock BEFORE INSERT ON public.exam_attempts_v2
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancel_start_lock();
CREATE FUNCTION public.exam_reset_cancel_grant_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('exam-v2:'||NEW.apprenant_id::text||':'||NEW.exam_id,0));
 IF NEW.consumed_at IS DISTINCT FROM OLD.consumed_at AND EXISTS (
 SELECT 1 FROM public.core_exam_reset_cancellations c WHERE c.reset_id=NEW.reset_id) THEN
 RAISE EXCEPTION 'CANCELLED_RESET_GRANT' USING ERRCODE='P0552'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reset_cancel_grant_guard BEFORE UPDATE ON public.exam_retake_authorizations
 FOR EACH ROW EXECUTE FUNCTION public.exam_reset_cancel_grant_guard();