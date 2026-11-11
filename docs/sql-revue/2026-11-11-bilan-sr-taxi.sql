-- Scope: future receipts for module 11 / exercise 602 only. Legacy editor banks are deliberately unchanged.
CREATE TABLE public.bilan_sr_taxi_releases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation text NOT NULL UNIQUE CHECK (operation='bilan_sr_taxi_20261111'),
 module_id integer NOT NULL DEFAULT 11 CHECK (module_id=11),
 exercise_id integer NOT NULL DEFAULT 602 CHECK (exercise_id=602),
 version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id),
 source_fingerprint text NOT NULL,
 target_fingerprint text NOT NULL,
 previous_value jsonb NOT NULL,
 mapping jsonb NOT NULL,
 activated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.bilan_sr_taxi_releases TO authenticated;
GRANT ALL ON public.bilan_sr_taxi_releases TO service_role;
ALTER TABLE public.bilan_sr_taxi_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_release_admin_read ON public.bilan_sr_taxi_releases FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER sr_release_immutable BEFORE UPDATE OR DELETE ON public.bilan_sr_taxi_releases FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();
CREATE FUNCTION public.bilan_sr_taxi_release_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE src jsonb; oldbank jsonb; v public.bilan_future_versions; bad boolean; max_reserved integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('bilan_sr_taxi_20261111',0));
 PERFORM 1 FROM public.module_editor_state WHERE module_id IN(5,11) ORDER BY module_id FOR SHARE;
 SELECT e INTO src FROM public.module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=5 AND e->>'id'='502';
 SELECT e INTO oldbank FROM public.module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e WHERE m.module_id=11 AND e->>'id'='602';
 SELECT * INTO v FROM public.bilan_future_versions WHERE id=NEW.version_id;
 IF src IS NULL OR oldbank IS NULL OR md5(src::text) IS DISTINCT FROM NEW.source_fingerprint OR md5(oldbank::text) IS DISTINCT FROM NEW.target_fingerprint OR oldbank IS DISTINCT FROM NEW.previous_value THEN
  RAISE EXCEPTION 'stale_source_or_target' USING ERRCODE='P0409';
 END IF;
 IF v.subject IS DISTINCT FROM 2 OR v.fingerprint IS DISTINCT FROM md5(v.questions::text) OR jsonb_array_length(v.questions) IS DISTINCT FROM 255 OR jsonb_array_length(src->'questions') IS DISTINCT FROM 255 OR jsonb_array_length(NEW.mapping) IS DISTINCT FROM 255 THEN
  RAISE EXCEPTION 'invalid_sr_version' USING ERRCODE='22023';
 END IF;
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(src->'questions') WITH ORDINALITY s(q,n) JOIN jsonb_array_elements(v.questions) WITH ORDINALITY t(q,n) USING(n) JOIN jsonb_array_elements(NEW.mapping) WITH ORDINALITY z(q,n) USING(n)
 WHERE public.bilan_alignment_canonical(s.q) IS DISTINCT FROM public.bilan_alignment_canonical(t.q) OR z.q->>'position' IS DISTINCT FROM s.n::text OR z.q->>'source_id' IS DISTINCT FROM s.q->>'id' OR z.q->>'target_id' IS DISTINCT FROM t.q->>'id') INTO bad;
 IF bad OR EXISTS(SELECT 1 FROM jsonb_array_elements(v.questions) q GROUP BY q->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'sr_position_or_identity_mismatch' USING ERRCODE='22023'; END IF;
 SELECT coalesce(max(numero_technique::integer),0) INTO max_reserved FROM public.bilan_question_identites WHERE module_id=11 AND exercice_id=602 AND numero_technique ~ '^[0-9]+$';
 FOR src IN SELECT value FROM jsonb_array_elements(v.questions) LOOP
  IF (src->>'id') !~ '^[0-9]+$' OR (src->>'id')::bigint>2147483647 THEN RAISE EXCEPTION 'invalid_sr_id'; END IF;
  IF (src->>'id')::integer<=max_reserved THEN
   IF (SELECT count(*) FROM jsonb_array_elements(oldbank->'questions') q WHERE public.bilan_alignment_canonical(q)=public.bilan_alignment_canonical(src))<>1
    OR (SELECT count(*) FROM jsonb_array_elements(v.questions) q WHERE public.bilan_alignment_canonical(q)=public.bilan_alignment_canonical(src))<>1
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(oldbank->'questions') q JOIN public.bilan_question_identites i ON i.module_id=11 AND i.exercice_id=602 AND i.numero_technique=q->>'id' AND i.uid::text=q->>'uid' WHERE q->>'id'=src->>'id' AND NOT i.litigieux AND public.bilan_alignment_canonical(q)=public.bilan_alignment_canonical(src)) THEN RAISE EXCEPTION 'unproved_reused_sr_id'; END IF;
  END IF;
 END LOOP;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.bilan_sr_taxi_release_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sr_release_guard BEFORE INSERT ON public.bilan_sr_taxi_releases FOR EACH ROW EXECUTE FUNCTION public.bilan_sr_taxi_release_guard();
CREATE OR REPLACE FUNCTION public.bilan_future_open(p_module integer, p_exercise integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE e public.bilan_future_eligibility; r public.bilan_future_receipts; v public.bilan_future_versions; vid uuid;
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
  IF p_exercise IN (500,600,501,601) THEN
    SELECT version_id INTO vid FROM public.bilan_future_common_releases
      WHERE subject=p_exercise % 100 ORDER BY activated_at DESC,id DESC LIMIT 1;
  END IF;
  IF p_exercise IN (503,603) THEN
    SELECT version_id INTO vid FROM public.bilan_future_french_releases ORDER BY activated_at DESC,version_id LIMIT 1;
  END IF;
  IF p_module=11 AND p_exercise=602 THEN
    SELECT version_id INTO vid FROM public.bilan_sr_taxi_releases ORDER BY activated_at DESC,id DESC LIMIT 1;
  END IF;
  vid:=coalesce(vid,e.version_id);
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=vid;
  IF v.subject IS DISTINCT FROM p_exercise % 100 OR v.fingerprint IS DISTINCT FROM md5(v.questions::text) THEN
    RAISE EXCEPTION 'Future bank identity or fingerprint mismatch' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES(auth.uid(),p_module,p_exercise,vid) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $function$
;
