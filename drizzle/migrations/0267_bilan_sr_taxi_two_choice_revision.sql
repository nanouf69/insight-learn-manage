CREATE TABLE public.bilan_sr_taxi_release_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation text NOT NULL UNIQUE CHECK(operation='bilan_sr_taxi_20261111_094053'),
 module_id integer NOT NULL DEFAULT 11 CHECK(module_id=11),
 exercise_id integer NOT NULL DEFAULT 602 CHECK(exercise_id=602),
 previous_version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id),
 version_id uuid NOT NULL UNIQUE REFERENCES public.bilan_future_versions(id),
 source_fingerprint text NOT NULL,
 mapping jsonb NOT NULL,
 activated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.bilan_sr_taxi_release_revisions TO authenticated;
GRANT ALL ON public.bilan_sr_taxi_release_revisions TO service_role;
ALTER TABLE public.bilan_sr_taxi_release_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_revision_admin_read ON public.bilan_sr_taxi_release_revisions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER sr_revision_immutable BEFORE UPDATE OR DELETE ON public.bilan_sr_taxi_release_revisions FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();
CREATE FUNCTION public.bilan_sr_taxi_revision_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE src jsonb; prior public.bilan_future_versions; fresh public.bilan_future_versions; base public.bilan_sr_taxi_releases; diff integer[];
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('bilan_sr_taxi_20261111',0));
 PERFORM 1 FROM public.module_editor_state WHERE module_id IN(5,11) ORDER BY module_id FOR SHARE;
 SELECT e INTO STRICT src FROM public.module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=5 AND e->>'id'='502';
 SELECT * INTO STRICT base FROM public.bilan_sr_taxi_releases ORDER BY activated_at DESC,id DESC LIMIT 1;
 SELECT * INTO STRICT prior FROM public.bilan_future_versions WHERE id=NEW.previous_version_id;
 SELECT * INTO STRICT fresh FROM public.bilan_future_versions WHERE id=NEW.version_id;
 IF NEW.previous_version_id IS DISTINCT FROM base.version_id OR NEW.version_id=NEW.previous_version_id OR NEW.mapping IS DISTINCT FROM base.mapping
  OR md5(src::text) IS DISTINCT FROM NEW.source_fingerprint THEN RAISE EXCEPTION 'stale_sr_source_or_predecessor' USING ERRCODE='P0409'; END IF;
 IF fresh.subject IS DISTINCT FROM 2 OR fresh.fingerprint IS DISTINCT FROM md5(fresh.questions::text)
  OR jsonb_array_length(fresh.questions)<>255 OR jsonb_array_length(prior.questions)<>255 OR jsonb_array_length(src->'questions')<>255 THEN
  RAISE EXCEPTION 'invalid_sr_revision' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(src->'questions') WITH ORDINALITY s(q,n)
  JOIN jsonb_array_elements(fresh.questions) WITH ORDINALITY f(q,n) USING(n)
  JOIN jsonb_array_elements(prior.questions) WITH ORDINALITY p(q,n) USING(n)
  JOIN jsonb_array_elements(NEW.mapping) WITH ORDINALITY z(q,n) USING(n)
  WHERE public.bilan_alignment_canonical(s.q) IS DISTINCT FROM public.bilan_alignment_canonical(f.q)
   OR f.q->'id' IS DISTINCT FROM p.q->'id' OR (f.q-'choix') IS DISTINCT FROM (p.q-'choix')
   OR z.q->>'position' IS DISTINCT FROM s.n::text OR z.q->'source_id' IS DISTINCT FROM s.q->'id' OR z.q->'target_id' IS DISTINCT FROM f.q->'id')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(fresh.questions) q GROUP BY q->>'id' HAVING count(*)>1) THEN
  RAISE EXCEPTION 'sr_revision_content_or_identity_mismatch' USING ERRCODE='22023'; END IF;
 SELECT array_agg(p.n::integer ORDER BY p.n) INTO diff FROM jsonb_array_elements(prior.questions) WITH ORDINALITY p(q,n)
  JOIN jsonb_array_elements(fresh.questions) WITH ORDINALITY f(q,n) USING(n) WHERE p.q IS DISTINCT FROM f.q;
 IF diff IS DISTINCT FROM ARRAY[71,78] THEN RAISE EXCEPTION 'sr_revision_outside_two_choices' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bilan_sr_taxi_revision_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sr_revision_guard BEFORE INSERT ON public.bilan_sr_taxi_release_revisions FOR EACH ROW EXECUTE FUNCTION public.bilan_sr_taxi_revision_guard();
CREATE OR REPLACE FUNCTION public.bilan_future_open(p_module integer, p_exercise integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.bilan_future_eligibility; r public.bilan_future_receipts; v public.bilan_future_versions; vid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF NOT ((p_module=5 AND p_exercise BETWEEN 500 AND 504) OR (p_module=11 AND p_exercise BETWEEN 600 AND 604)) THEN RAISE EXCEPTION 'Outside common Bilan scope' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('bilan-future:'||auth.uid()||':'||p_module||':'||p_exercise,0));
 SELECT * INTO r FROM public.bilan_future_receipts WHERE owner_id=auth.uid() AND module_id=p_module AND exercise_id=p_exercise;
 IF r.id IS NOT NULL THEN RETURN to_jsonb(r); END IF;
 SELECT * INTO e FROM public.bilan_future_eligibility WHERE owner_id=auth.uid() AND module_id=p_module AND exercise_id=p_exercise;
 IF e.owner_id IS NULL THEN RETURN jsonb_build_object('route','legacy'); END IF;
 IF p_exercise IN (500,600,501,601) THEN SELECT version_id INTO vid FROM public.bilan_future_common_releases WHERE subject=p_exercise % 100 ORDER BY activated_at DESC,id DESC LIMIT 1; END IF;
 IF p_exercise IN (503,603) THEN SELECT version_id INTO vid FROM public.bilan_future_french_releases ORDER BY activated_at DESC,version_id LIMIT 1; END IF;
 IF p_module=11 AND p_exercise=602 THEN
  SELECT version_id INTO vid FROM (
   SELECT version_id,activated_at,id FROM public.bilan_sr_taxi_releases
   UNION ALL SELECT version_id,activated_at,id FROM public.bilan_sr_taxi_release_revisions
  ) releases ORDER BY activated_at DESC,id DESC LIMIT 1;
 END IF;
 vid:=coalesce(vid,e.version_id);
 SELECT * INTO v FROM public.bilan_future_versions WHERE id=vid;
 IF v.subject IS DISTINCT FROM p_exercise % 100 OR v.fingerprint IS DISTINCT FROM md5(v.questions::text) THEN RAISE EXCEPTION 'Future bank identity or fingerprint mismatch' USING ERRCODE='22023'; END IF;
 INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES(auth.uid(),p_module,p_exercise,vid) RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;