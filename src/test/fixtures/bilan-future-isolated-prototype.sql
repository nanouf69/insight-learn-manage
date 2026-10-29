-- Versioned future Bilan examen 5/11 circuit. Additive only: no writes to legacy Bilan/EB tables.
-- No writes, triggers, references or changes to legacy Bilan/EB tables.
CREATE TABLE public.bilan_future_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject integer NOT NULL CHECK (subject BETWEEN 0 AND 4),
  questions jsonb NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) > 0)
);
GRANT SELECT ON public.bilan_future_versions TO authenticated;
GRANT ALL ON public.bilan_future_versions TO service_role;
ALTER TABLE public.bilan_future_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_version_admin ON public.bilan_future_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Eligibility is explicit, never inferred from missing answers or a device date.
CREATE TABLE public.bilan_future_eligibility (
  owner_id uuid NOT NULL,
  module_id integer NOT NULL CHECK (module_id IN (5,11)),
  exercise_id integer NOT NULL,
  version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id),
  authorized_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(owner_id,module_id,exercise_id),
  CHECK ((module_id=5 AND exercise_id BETWEEN 500 AND 504) OR (module_id=11 AND exercise_id BETWEEN 600 AND 604))
);
GRANT SELECT ON public.bilan_future_eligibility TO authenticated;
GRANT ALL ON public.bilan_future_eligibility TO service_role;
ALTER TABLE public.bilan_future_eligibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_eligibility_owner ON public.bilan_future_eligibility FOR SELECT TO authenticated USING (owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.bilan_future_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercise_id integer NOT NULL,
  version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(owner_id,module_id,exercise_id),
  FOREIGN KEY(owner_id,module_id,exercise_id) REFERENCES public.bilan_future_eligibility(owner_id,module_id,exercise_id)
);
GRANT SELECT ON public.bilan_future_receipts TO authenticated;
GRANT ALL ON public.bilan_future_receipts TO service_role;
ALTER TABLE public.bilan_future_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_receipt_owner ON public.bilan_future_receipts FOR SELECT TO authenticated USING(owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
-- Learners never read the bank table (it holds keys); they use bilan_future_questions().

CREATE TABLE public.bilan_future_submissions (
  receipt_id uuid PRIMARY KEY REFERENCES public.bilan_future_receipts(id),
  answers jsonb NOT NULL,
  correct_count integer NOT NULL,
  question_count integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.bilan_future_submissions TO authenticated;
GRANT ALL ON public.bilan_future_submissions TO service_role;
ALTER TABLE public.bilan_future_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_submission_owner ON public.bilan_future_submissions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.bilan_future_receipts r WHERE r.id=receipt_id AND r.owner_id=auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.bilan_future_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Future Bilan proof immutable' USING ERRCODE='P0491'; END $$;
CREATE TRIGGER future_version_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_versions FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();
CREATE TRIGGER future_eligibility_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_eligibility FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();
CREATE TRIGGER future_receipt_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_receipts FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();
CREATE TRIGGER future_submission_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_submissions FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();

CREATE FUNCTION public.bilan_future_open(p_module integer,p_exercise integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.bilan_future_eligibility; r public.bilan_future_receipts; v public.bilan_future_versions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF NOT ((p_module=5 AND p_exercise BETWEEN 500 AND 504) OR (p_module=11 AND p_exercise BETWEEN 600 AND 604)) THEN
    RAISE EXCEPTION 'Outside common Bilan scope' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('bilan-future:'||auth.uid()||':'||p_module||':'||p_exercise,0));
  SELECT * INTO r FROM public.bilan_future_receipts WHERE owner_id=auth.uid() AND module_id=p_module AND exercise_id=p_exercise;
  IF r.id IS NOT NULL THEN RETURN to_jsonb(r); END IF;
  SELECT * INTO e FROM public.bilan_future_eligibility WHERE owner_id=auth.uid() AND module_id=p_module AND exercise_id=p_exercise;
  IF e.owner_id IS NULL THEN RETURN jsonb_build_object('route','legacy'); END IF;
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=e.version_id;
  IF v.subject <> p_exercise % 100 OR v.fingerprint <> md5(v.questions::text) THEN
    RAISE EXCEPTION 'Future bank identity or fingerprint mismatch' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES(auth.uid(),p_module,p_exercise,e.version_id) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_open(integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_open(integer,integer) TO authenticated;

CREATE FUNCTION public.bilan_future_submit(p_receipt uuid,p_answers jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts; v public.bilan_future_versions; s public.bilan_future_submissions; q jsonb; correct integer:=0; expected jsonb; selected jsonb;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id=p_receipt AND owner_id=auth.uid();
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receipt ownership required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('future-submit:'||p_receipt,0));
  SELECT * INTO s FROM public.bilan_future_submissions WHERE receipt_id=p_receipt;
  IF s.receipt_id IS NOT NULL THEN
    IF s.answers IS DISTINCT FROM p_answers THEN RAISE EXCEPTION 'Submitted proof immutable' USING ERRCODE='P0491'; END IF;
    RETURN to_jsonb(s);
  END IF;
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=r.version_id;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid answers' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_answers) k WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v.questions) z WHERE z->>'id'=k)) THEN
    RAISE EXCEPTION 'Answer outside frozen bank' USING ERRCODE='22023';
  END IF;
  FOR q IN SELECT value FROM jsonb_array_elements(v.questions) LOOP
    IF jsonb_typeof(p_answers->(q->>'id')) IS DISTINCT FROM 'array' OR jsonb_array_length(p_answers->(q->>'id'))=0 THEN
      RAISE EXCEPTION 'Incomplete answers' USING ERRCODE='22023';
    END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_answers->(q->>'id')) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'lettre'=x)) THEN
      RAISE EXCEPTION 'Unknown choice' USING ERRCODE='22023';
    END IF;
    SELECT jsonb_agg(c->>'lettre' ORDER BY c->>'lettre') INTO expected FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true';
    SELECT jsonb_agg(x ORDER BY x) INTO selected FROM jsonb_array_elements_text(p_answers->(q->>'id')) x;
    IF expected=selected THEN correct:=correct+1; END IF;
  END LOOP;
  INSERT INTO public.bilan_future_submissions(receipt_id,answers,correct_count,question_count) VALUES(r.id,p_answers,correct,jsonb_array_length(v.questions)) RETURNING * INTO s;
  RETURN to_jsonb(s);
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_submit(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_submit(uuid,jsonb) TO authenticated;
-- Receipt-scoped draft transport. Every write names receipt AND version; legacy module_X_exo_Y keys cannot reach it.
CREATE TABLE public.bilan_future_drafts (
  receipt_id uuid NOT NULL REFERENCES public.bilan_future_receipts(id),
  version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id),
  question_id integer NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  answer jsonb NOT NULL CHECK (jsonb_typeof(answer)='array'),
  client_token uuid NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(receipt_id,question_id,revision)
);
GRANT SELECT ON public.bilan_future_drafts TO authenticated;
GRANT ALL ON public.bilan_future_drafts TO service_role;
ALTER TABLE public.bilan_future_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_draft_owner ON public.bilan_future_drafts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.bilan_future_receipts r WHERE r.id=receipt_id AND r.owner_id=auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER future_draft_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_drafts FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();

CREATE FUNCTION public.bilan_future_save_draft(p_receipt uuid,p_version uuid,p_question integer,p_revision integer,p_answer jsonb,p_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts; v public.bilan_future_versions; d public.bilan_future_drafts; last_rev integer; q jsonb;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id=p_receipt AND owner_id=auth.uid();
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receipt ownership required' USING ERRCODE='42501'; END IF;
  IF r.version_id IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Receipt version mismatch' USING ERRCODE='P0492'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('future-submit:'||p_receipt,0));
  IF EXISTS(SELECT 1 FROM public.bilan_future_submissions WHERE receipt_id=p_receipt) THEN
    RAISE EXCEPTION 'Passage already submitted' USING ERRCODE='P0491';
  END IF;
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=r.version_id;
  SELECT z INTO q FROM jsonb_array_elements(v.questions) z WHERE (z->>'id')::int=p_question;
  IF q IS NULL THEN RAISE EXCEPTION 'Answer outside frozen bank' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_answer) IS DISTINCT FROM 'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_answer) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'lettre'=x)) THEN
    RAISE EXCEPTION 'Unknown choice' USING ERRCODE='22023';
  END IF;
  SELECT * INTO d FROM public.bilan_future_drafts WHERE receipt_id=p_receipt AND question_id=p_question AND revision=p_revision;
  IF d.receipt_id IS NOT NULL THEN
    IF d.client_token=p_token AND d.answer=p_answer THEN RETURN to_jsonb(d); END IF;
    RAISE EXCEPTION 'Stale draft revision' USING ERRCODE='P0493';
  END IF;
  SELECT coalesce(max(revision),0) INTO last_rev FROM public.bilan_future_drafts WHERE receipt_id=p_receipt AND question_id=p_question;
  IF p_revision <> last_rev+1 THEN RAISE EXCEPTION 'Stale draft revision' USING ERRCODE='P0493'; END IF;
  INSERT INTO public.bilan_future_drafts(receipt_id,version_id,question_id,revision,answer,client_token)
  VALUES(p_receipt,p_version,p_question,p_revision,p_answer,p_token) RETURNING * INTO d;
  RETURN to_jsonb(d);
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_save_draft(uuid,uuid,integer,integer,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_save_draft(uuid,uuid,integer,integer,jsonb,uuid) TO authenticated;

-- Resume: latest revision per question for this receipt only.
CREATE FUNCTION public.bilan_future_resume(p_receipt uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id=p_receipt AND owner_id=auth.uid();
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receipt ownership required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('receipt_id',r.id,'version_id',r.version_id,
    'submitted',EXISTS(SELECT 1 FROM public.bilan_future_submissions s WHERE s.receipt_id=r.id),
    'answers',coalesce((SELECT jsonb_object_agg(question_id::text,jsonb_build_object('revision',revision,'answer',answer))
      FROM (SELECT DISTINCT ON(question_id) question_id,revision,answer FROM public.bilan_future_drafts WHERE receipt_id=r.id ORDER BY question_id,revision DESC) t),'{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_resume(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_resume(uuid) TO authenticated;

-- Learner-safe projection of the frozen bank: no keys, no explanations.
CREATE FUNCTION public.bilan_future_questions(p_receipt uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts; v public.bilan_future_versions;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id=p_receipt AND owner_id=auth.uid();
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receipt ownership required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=r.version_id;
  RETURN jsonb_build_object('receipt_id',r.id,'version_id',v.id,'module_id',r.module_id,'exercise_id',r.exercise_id,'fingerprint',v.fingerprint,
    'questions',(SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',q->'id','enonce',q->'enonce','image',q->'image','imageSize',q->'imageSize',
       'choix',(SELECT jsonb_agg(jsonb_build_object('lettre',c->'lettre','texte',c->'texte') ORDER BY o) FROM jsonb_array_elements(q->'choix') WITH ORDINALITY AS x(c,o)))) ORDER BY n)
       FROM jsonb_array_elements(v.questions) WITH ORDINALITY AS y(q,n)));
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_questions(uuid) TO authenticated;

-- Active version per subject (one shared bank for VTC 5 and TAXI 11) and opening switch (default closed).
CREATE TABLE public.bilan_future_active (
  subject integer PRIMARY KEY CHECK (subject BETWEEN 0 AND 4),
  version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id)
);
GRANT SELECT ON public.bilan_future_active TO authenticated;
GRANT ALL ON public.bilan_future_active TO service_role;
ALTER TABLE public.bilan_future_active ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_active_admin ON public.bilan_future_active FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER future_active_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_active FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();

CREATE TABLE public.bilan_future_opening (
  id integer PRIMARY KEY CHECK (id=1),
  open_to_new boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.bilan_future_opening(id,open_to_new) VALUES(1,false);
GRANT SELECT ON public.bilan_future_opening TO authenticated;
GRANT ALL ON public.bilan_future_opening TO service_role;
ALTER TABLE public.bilan_future_opening ENABLE ROW LEVEL SECURITY;
CREATE POLICY future_opening_read ON public.bilan_future_opening FOR SELECT TO authenticated USING (true);

-- Proof that a learner has NO legacy trace for this Bilan module (answers incl. revisions, snapshots,
-- frozen passages, categories, any completion row). Evidence-based cutover, never a date.
CREATE FUNCTION public.bilan_future_sans_trace_ancienne(p_apprenant uuid,p_module integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT NOT EXISTS(SELECT 1 FROM public.reponses_apprenants WHERE apprenant_id=p_apprenant AND exercice_id ~ ('^module_'||p_module||'_(revision_)?exo_'))
     AND NOT EXISTS(SELECT 1 FROM public.bilan_passage_snapshots WHERE apprenant_id=p_apprenant AND module_id=p_module)
     AND NOT EXISTS(SELECT 1 FROM public.bilan_passage_categories WHERE apprenant_id=p_apprenant AND module_id=p_module)
     AND NOT EXISTS(SELECT 1 FROM public.bilan_passages_figes WHERE apprenant_id=p_apprenant AND module_id=p_module)
     AND NOT EXISTS(SELECT 1 FROM public.apprenant_module_completion WHERE apprenant_id=p_apprenant AND module_id=p_module)
$$;
REVOKE ALL ON FUNCTION public.bilan_future_sans_trace_ancienne(uuid,integer) FROM PUBLIC;

-- Grant all five subjects of one module to one learner account. Refused if any legacy trace exists.
CREATE FUNCTION public.bilan_future_grant_internal(p_owner uuid,p_module integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ap uuid; n integer;
BEGIN
  IF p_module NOT IN (5,11) THEN RAISE EXCEPTION 'Outside common Bilan scope' USING ERRCODE='22023'; END IF;
  SELECT id INTO ap FROM public.apprenants WHERE auth_user_id=p_owner AND deleted_at IS NULL LIMIT 1;
  IF ap IS NULL THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.bilan_future_eligibility WHERE owner_id=p_owner AND module_id=p_module) THEN RETURN true; END IF;
  IF NOT public.bilan_future_sans_trace_ancienne(ap,p_module) THEN RETURN false; END IF;
  SELECT count(*) INTO n FROM public.bilan_future_active;
  IF n<>5 THEN RETURN false; END IF;
  INSERT INTO public.bilan_future_eligibility(owner_id,module_id,exercise_id,version_id)
    SELECT p_owner,p_module,(CASE WHEN p_module=5 THEN 500 ELSE 600 END)+subject,version_id FROM public.bilan_future_active;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_grant_internal(uuid,integer) FROM PUBLIC;

CREATE FUNCTION public.bilan_future_admin_grant(p_apprenant uuid,p_module integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o uuid;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  SELECT auth_user_id INTO o FROM public.apprenants WHERE id=p_apprenant;
  IF o IS NULL THEN RETURN false; END IF;
  RETURN public.bilan_future_grant_internal(o,p_module);
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_admin_grant(uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_admin_grant(uuid,integer) TO authenticated;

-- Route for the learner screen: 'future' only when all five subjects are eligible
-- (auto-granted only if opening is on AND the account has no legacy trace); otherwise 'legacy'.
CREATE FUNCTION public.bilan_future_route(p_module integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_module NOT IN (5,11) THEN RETURN 'legacy'; END IF;
  IF (SELECT count(*) FROM public.bilan_future_eligibility WHERE owner_id=auth.uid() AND module_id=p_module)=5 THEN RETURN 'future'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.bilan_future_eligibility WHERE owner_id=auth.uid() AND module_id=p_module)
     AND (SELECT open_to_new FROM public.bilan_future_opening WHERE id=1) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('bilan-future-grant:'||auth.uid()||':'||p_module,0));
    IF public.bilan_future_grant_internal(auth.uid(),p_module) THEN RETURN 'future'; END IF;
  END IF;
  RETURN 'legacy';
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_route(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_future_route(integer) TO authenticated;

-- Completion bridge: when the 5 subjects of the module are submitted, record module completion with
-- per-question details (exerciceId/questionId/reponseEleve) so moduleCompletionEvidence accepts it.
-- Never touches an existing 'completed' row.
CREATE FUNCTION public.bilan_future_completion_bridge() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts; ap uuid; n integer; ok integer; tot integer; det jsonb;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id=NEW.receipt_id;
  SELECT count(*),sum(s.correct_count),sum(s.question_count) INTO n,ok,tot FROM public.bilan_future_submissions s
    JOIN public.bilan_future_receipts x ON x.id=s.receipt_id WHERE x.owner_id=r.owner_id AND x.module_id=r.module_id;
  IF n<5 THEN RETURN NEW; END IF;
  SELECT id INTO ap FROM public.apprenants WHERE auth_user_id=r.owner_id AND deleted_at IS NULL LIMIT 1;
  IF ap IS NULL THEN RETURN NEW; END IF;
  SELECT jsonb_agg(jsonb_build_object('exerciceId',x.exercise_id,'questionId',(k.key)::int,'reponseEleve',k.value,'source','bilan_future','receiptId',x.id) ORDER BY x.exercise_id,(k.key)::int)
    INTO det FROM public.bilan_future_submissions s JOIN public.bilan_future_receipts x ON x.id=s.receipt_id, jsonb_each(s.answers) k
    WHERE x.owner_id=r.owner_id AND x.module_id=r.module_id;
  INSERT INTO public.apprenant_module_completion(apprenant_id,module_id,status,progress,completed_at,score_obtenu,score_max,details)
    VALUES(ap,r.module_id,'completed',100,clock_timestamp(),ok,tot,det)
  ON CONFLICT(apprenant_id,module_id) DO UPDATE SET status='completed',progress=100,completed_at=clock_timestamp(),
    score_obtenu=EXCLUDED.score_obtenu,score_max=EXCLUDED.score_max,details=EXCLUDED.details,updated_at=clock_timestamp()
    WHERE public.apprenant_module_completion.status IS DISTINCT FROM 'completed';
  RETURN NEW;
END $$;
CREATE TRIGGER future_submission_completion AFTER INSERT ON public.bilan_future_submissions FOR EACH ROW EXECUTE FUNCTION public.bilan_future_completion_bridge();
