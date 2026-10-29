-- TEST-ONLY prototype. Not a migration, no live installation or automatic cutover.
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
CREATE POLICY future_version_receipt ON public.bilan_future_versions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.bilan_future_receipts r WHERE r.version_id=bilan_future_versions.id AND r.owner_id=auth.uid()));

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