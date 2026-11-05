-- Additive French release pointer. Original banks, eligibility and receipts remain immutable.
CREATE TABLE public.bilan_future_french_releases (
  version_id uuid PRIMARY KEY REFERENCES public.bilan_future_versions(id),
  activated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.bilan_future_french_releases TO authenticated;
GRANT ALL ON public.bilan_future_french_releases TO service_role;
ALTER TABLE public.bilan_future_french_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY french_release_admin ON public.bilan_future_french_releases FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER french_release_immutable BEFORE UPDATE OR DELETE ON public.bilan_future_french_releases FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();

CREATE FUNCTION public.bilan_future_french_release_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v public.bilan_future_versions;
BEGIN
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=NEW.version_id;
  IF v.subject IS DISTINCT FROM 3 OR v.fingerprint IS DISTINCT FROM md5(v.questions::text) OR jsonb_array_length(v.questions)<>63
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(v.questions) q WHERE q->>'type' IS DISTINCT FROM 'QCM'
      OR jsonb_typeof(q->'support'->'paragraphes') IS DISTINCT FROM 'array'
      OR jsonb_array_length(q->'support'->'paragraphes')=0
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true'))
    OR (SELECT count(DISTINCT q->>'id') FROM jsonb_array_elements(v.questions) q)<>63
    OR (SELECT count(DISTINCT q->'support'->>'numero') FROM jsonb_array_elements(v.questions) q)<>9
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(v.questions) q GROUP BY q->'support' HAVING count(*)<>7)
  THEN RAISE EXCEPTION 'French release requires 63 verified QCM and nine supports of seven questions' USING ERRCODE='22023'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_french_release_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER french_release_guard BEFORE INSERT ON public.bilan_future_french_releases FOR EACH ROW EXECUTE FUNCTION public.bilan_future_french_release_guard();

CREATE OR REPLACE FUNCTION public.bilan_future_open(p_module integer,p_exercise integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
  IF p_exercise IN (503,603) THEN
    SELECT version_id INTO vid FROM public.bilan_future_french_releases ORDER BY activated_at DESC,version_id LIMIT 1;
  END IF;
  vid:=coalesce(vid,e.version_id);
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=vid;
  IF v.subject IS DISTINCT FROM p_exercise % 100 OR v.fingerprint IS DISTINCT FROM md5(v.questions::text) THEN
    RAISE EXCEPTION 'Future bank identity or fingerprint mismatch' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES(auth.uid(),p_module,p_exercise,vid) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_open(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_future_open(integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.bilan_future_questions(p_receipt uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts; v public.bilan_future_versions;
BEGIN
  SELECT * INTO r FROM public.bilan_future_receipts WHERE id=p_receipt AND owner_id=auth.uid();
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receipt ownership required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=r.version_id;
  RETURN jsonb_build_object('receipt_id',r.id,'version_id',v.id,'module_id',r.module_id,'exercise_id',r.exercise_id,'fingerprint',v.fingerprint,
    'questions',(SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',q->'id','enonce',q->'enonce','image',q->'image','imageSize',q->'imageSize',
      'support',CASE WHEN r.exercise_id IN (503,603) THEN q->'support' END,
      'choix',(SELECT jsonb_agg(jsonb_build_object('lettre',c->'lettre','texte',c->'texte') ORDER BY o) FROM jsonb_array_elements(q->'choix') WITH ORDINALITY AS x(c,o)))) ORDER BY n)
      FROM jsonb_array_elements(v.questions) WITH ORDINALITY AS y(q,n)));
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_questions(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_future_questions(uuid) TO authenticated;