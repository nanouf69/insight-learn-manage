-- Alignement ciblé Bilan Examen T3P/Gestion VTC/TAXI — 08/11/2026.
-- DDL + fonctions internes. Les données sont modifiées uniquement par un appel
-- service_role explicite à run_bilan_t3p_gestion_alignment_20261108().

CREATE TABLE public.bilan_alignment_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  object_type text NOT NULL,
  object_key text NOT NULL,
  previous_value jsonb NOT NULL,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(operation, object_type, object_key)
);
GRANT SELECT ON public.bilan_alignment_archives TO authenticated;
GRANT ALL ON public.bilan_alignment_archives TO service_role;
ALTER TABLE public.bilan_alignment_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY bilan_alignment_archives_admin_read ON public.bilan_alignment_archives
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Publications additives : aucune version, éligibilité ou reçu existant n'est modifié.
CREATE TABLE public.bilan_future_common_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject integer NOT NULL CHECK (subject IN (0, 1)),
  version_id uuid NOT NULL REFERENCES public.bilan_future_versions(id),
  activated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.bilan_future_common_releases TO authenticated;
GRANT ALL ON public.bilan_future_common_releases TO service_role;
ALTER TABLE public.bilan_future_common_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY bilan_future_common_releases_admin_read ON public.bilan_future_common_releases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER future_common_release_immutable
  BEFORE UPDATE OR DELETE ON public.bilan_future_common_releases
  FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_future_immutable();

-- Seuls les nouveaux reçus T3P/Gestion consultent la dernière publication.
-- Le retour anticipé d'un reçu existant reste inchangé : son passage reste figé.
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
  vid:=coalesce(vid,e.version_id);
  SELECT * INTO v FROM public.bilan_future_versions WHERE id=vid;
  IF v.subject IS DISTINCT FROM p_exercise % 100 OR v.fingerprint IS DISTINCT FROM md5(v.questions::text) THEN
    RAISE EXCEPTION 'Future bank identity or fingerprint mismatch' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.bilan_future_receipts(owner_id,module_id,exercise_id,version_id) VALUES(auth.uid(),p_module,p_exercise,vid) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $function$;

CREATE OR REPLACE FUNCTION public.bilan_alignment_canonical(q jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'enonce', q->'enonce',
    'choix', COALESCE(q->'choix','[]'::jsonb),
    'type', COALESCE(q->>'type','QCM'),
    'image', q->'image',
    'imageSize', q->'imageSize',
    'explication', q->'explication',
    'bareme', q->'bareme',
    'reponseQRC', q->'reponseQRC',
    'reponses_possibles', q->'reponses_possibles'
  )
$$;

CREATE OR REPLACE FUNCTION public.bilan_alignment_future(q jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object('id',q->'id') || public.bilan_alignment_canonical(q)
$$;

CREATE OR REPLACE FUNCTION public.bilan_alignment_set_questions(md jsonb, exo integer, qs jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_set(md,'{exercices}',(
    SELECT jsonb_agg(CASE WHEN (e->>'id')::integer=exo THEN jsonb_set(e,'{questions}',qs) ELSE e END ORDER BY ord)
    FROM jsonb_array_elements(md->'exercices') WITH ORDINALITY x(e,ord)
  ))
$$;

CREATE OR REPLACE FUNCTION public.run_bilan_t3p_gestion_alignment_20261108(p_expected jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_op constant text := 'bilan_t3p_gestion_20261108';
  v_data5 jsonb; v_data11 jsonb;
  v_vtc_t3p jsonb; v_taxi_t3p jsonb; v_vtc_gestion jsonb; v_taxi_gestion jsonb;
  v_vtc_t3p_new jsonb := '[]'::jsonb; v_taxi_t3p_new jsonb := '[]'::jsonb;
  v_taxi_gestion_new jsonb := '[]'::jsonb;
  v_q jsonb; v_tq jsonb; v_taxi_only jsonb; v_copy jsonb;
  v_id integer; v_new_vtc_id integer; v_matched integer[] := '{}'::integer[];
  v_sig_v jsonb; v_sig_t jsonb; v_letters_v jsonb; v_letters_t jsonb;
  v_same boolean; v_future0 jsonb; v_future1 jsonb;
  v_version0 uuid; v_version1 uuid; v_previous0 uuid; v_previous1 uuid;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_op,0));
  IF EXISTS(SELECT 1 FROM public.bilan_alignment_archives WHERE operation=v_op) THEN
    RETURN jsonb_build_object('statut','deja_applique');
  END IF;
  IF jsonb_typeof(p_expected) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'expected_fingerprints_required' USING ERRCODE='22023';
  END IF;
  IF NOT (SELECT COALESCE((SELECT actif FROM public.bilan_identite_flags WHERE module_id=5),false)
              AND COALESCE((SELECT actif FROM public.bilan_identite_flags WHERE module_id=11),false)) THEN
    RAISE EXCEPTION 'identity_guard_required' USING ERRCODE='P0497';
  END IF;

  PERFORM 1 FROM public.module_editor_state WHERE module_id IN (5,11) ORDER BY module_id FOR UPDATE;
  SELECT module_data INTO v_data5 FROM public.module_editor_state WHERE module_id=5;
  SELECT module_data INTO v_data11 FROM public.module_editor_state WHERE module_id=11;
  IF v_data5 IS NULL OR v_data11 IS NULL THEN RAISE EXCEPTION 'module_missing' USING ERRCODE='P0494'; END IF;

  SELECT e INTO v_vtc_t3p FROM jsonb_array_elements(v_data5->'exercices') e WHERE e->>'id'='500';
  SELECT e INTO v_taxi_t3p FROM jsonb_array_elements(v_data11->'exercices') e WHERE e->>'id'='600';
  SELECT e INTO v_vtc_gestion FROM jsonb_array_elements(v_data5->'exercices') e WHERE e->>'id'='501';
  SELECT e INTO v_taxi_gestion FROM jsonb_array_elements(v_data11->'exercices') e WHERE e->>'id'='601';
  IF v_vtc_t3p IS NULL OR v_taxi_t3p IS NULL OR v_vtc_gestion IS NULL OR v_taxi_gestion IS NULL THEN
    RAISE EXCEPTION 'exercise_missing' USING ERRCODE='P0494';
  END IF;
  IF md5(v_vtc_t3p::text) IS DISTINCT FROM p_expected->>'5/500'
     OR md5(v_vtc_gestion::text) IS DISTINCT FROM p_expected->>'5/501'
     OR md5(v_taxi_t3p::text) IS DISTINCT FROM p_expected->>'11/600'
     OR md5(v_taxi_gestion::text) IS DISTINCT FROM p_expected->>'11/601' THEN
    RAISE EXCEPTION 'stale_alignment_fingerprint' USING ERRCODE='P0409';
  END IF;

  SELECT COALESCE(max(numero_technique::integer),0)+1 INTO v_new_vtc_id
    FROM public.bilan_question_identites
   WHERE module_id=5 AND exercice_id=500 AND numero_technique ~ '^[0-9]+$';
  IF EXISTS(SELECT 1 FROM public.bilan_question_identites WHERE module_id=5 AND exercice_id=500 AND numero_technique=v_new_vtc_id::text)
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_vtc_t3p->'questions') q WHERE q->>'id'=v_new_vtc_id::text) THEN
    RAISE EXCEPTION 'new_vtc_identity_conflict' USING ERRCODE='P0497';
  END IF;
  IF EXISTS(SELECT 1 FROM public.bilan_question_identites
             WHERE (module_id=11 AND exercice_id=600 AND numero_technique IN ('112','113','114'))
                OR (module_id=11 AND exercice_id=601 AND numero_technique IN ('198','199'))) THEN
    RAISE EXCEPTION 'taxi_copy_identity_conflict' USING ERRCODE='P0497';
  END IF;
  SELECT q INTO v_taxi_only FROM jsonb_array_elements(v_taxi_t3p->'questions') q WHERE q->>'id'='59';
  IF v_taxi_only IS NULL THEN RAISE EXCEPTION 'taxi_q59_missing' USING ERRCODE='P0494'; END IF;

  -- T3P : ordre VTC actuel, trois ajouts VTC->TAXI, puis la question TAXI propre en dernier.
  FOR v_q IN SELECT value FROM jsonb_array_elements(v_vtc_t3p->'questions') LOOP
    v_id := (v_q->>'id')::integer;
    v_vtc_t3p_new := v_vtc_t3p_new || jsonb_build_array(v_q);
    SELECT t INTO v_tq FROM jsonb_array_elements(v_taxi_t3p->'questions') t WHERE t->>'id'=v_q->>'id';
    IF v_tq IS NOT NULL THEN
      IF public.bilan_alignment_canonical(v_q) IS DISTINCT FROM public.bilan_alignment_canonical(v_tq) THEN
        RAISE EXCEPTION 'unexpected_t3p_content_difference:%',v_id USING ERRCODE='22023';
      END IF;
      v_taxi_t3p_new := v_taxi_t3p_new || jsonb_build_array(v_tq);
      v_matched := v_matched || v_id;
    ELSIF v_id IN (112,113,114) THEN
      v_copy := (v_q - ARRAY['uid','question_id','_canonicalChoix','_canonicalUpdatedAt']);
      v_taxi_t3p_new := v_taxi_t3p_new || jsonb_build_array(v_copy);
    ELSE
      RAISE EXCEPTION 'unexpected_t3p_vtc_only:%',v_id USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_taxi_t3p->'questions') q
             WHERE q->>'id'<>'59' AND NOT (q->>'id')::integer=ANY(v_matched)) THEN
    RAISE EXCEPTION 'unexpected_t3p_taxi_only' USING ERRCODE='22023';
  END IF;
  v_copy := (v_taxi_only - ARRAY['uid','question_id','_canonicalChoix','_canonicalUpdatedAt']) || jsonb_build_object('id',v_new_vtc_id);
  v_vtc_t3p_new := v_vtc_t3p_new || jsonb_build_array(v_copy);
  v_taxi_t3p_new := v_taxi_t3p_new || jsonb_build_array(v_taxi_only);

  -- Gestion : VTC inchangé ; deux ajouts VTC->TAXI et cinq harmonisations sans changer les clés.
  FOR v_q IN SELECT value FROM jsonb_array_elements(v_vtc_gestion->'questions') LOOP
    v_id := (v_q->>'id')::integer;
    SELECT t INTO v_tq FROM jsonb_array_elements(v_taxi_gestion->'questions') t WHERE t->>'id'=v_q->>'id';
    IF v_tq IS NULL AND v_id IN (198,199) THEN
      v_copy := (v_q - ARRAY['uid','question_id','_canonicalChoix','_canonicalUpdatedAt']);
      v_taxi_gestion_new := v_taxi_gestion_new || jsonb_build_array(v_copy);
      CONTINUE;
    END IF;
    IF v_tq IS NULL THEN RAISE EXCEPTION 'unexpected_gestion_vtc_only:%',v_id USING ERRCODE='22023'; END IF;
    IF v_id IN (48,53,75,101,138) THEN
      SELECT jsonb_agg(c->>'lettre' ORDER BY c->>'lettre'),
             jsonb_agg(c->>'lettre' ORDER BY c->>'lettre') FILTER(WHERE COALESCE((c->>'correct')::boolean,false))
        INTO v_letters_v,v_sig_v FROM jsonb_array_elements(v_q->'choix') c;
      SELECT jsonb_agg(c->>'lettre' ORDER BY c->>'lettre'),
             jsonb_agg(c->>'lettre' ORDER BY c->>'lettre') FILTER(WHERE COALESCE((c->>'correct')::boolean,false))
        INTO v_letters_t,v_sig_t FROM jsonb_array_elements(v_tq->'choix') c;
      IF v_letters_v IS DISTINCT FROM v_letters_t OR v_sig_v IS DISTINCT FROM v_sig_t THEN
        RAISE EXCEPTION 'gestion_correct_answer_change_refused:%',v_id USING ERRCODE='22023';
      END IF;
      v_tq := v_tq || jsonb_build_object(
        'enonce',v_q->'enonce','choix',v_q->'choix','type',v_q->'type',
        'image',v_q->'image','imageSize',v_q->'imageSize','explication',v_q->'explication');
    ELSIF public.bilan_alignment_canonical(v_q) IS DISTINCT FROM public.bilan_alignment_canonical(v_tq) THEN
      RAISE EXCEPTION 'unexpected_gestion_content_difference:%',v_id USING ERRCODE='22023';
    END IF;
    v_taxi_gestion_new := v_taxi_gestion_new || jsonb_build_array(v_tq);
  END LOOP;
  IF jsonb_array_length(v_taxi_gestion_new) <> jsonb_array_length(v_taxi_gestion->'questions')+2 THEN
    RAISE EXCEPTION 'unexpected_gestion_taxi_only' USING ERRCODE='22023';
  END IF;

  -- Preuve avant écriture : même contenu pédagogique à chaque position, sans exiger le même identifiant de stockage.
  WITH v AS (SELECT q,ord FROM jsonb_array_elements(v_vtc_t3p_new) WITH ORDINALITY x(q,ord)),
       t AS (SELECT q,ord FROM jsonb_array_elements(v_taxi_t3p_new) WITH ORDINALITY x(q,ord))
  SELECT bool_and(public.bilan_alignment_canonical(v.q)=public.bilan_alignment_canonical(t.q)) INTO v_same
    FROM v JOIN t USING(ord);
  IF NOT COALESCE(v_same,false)
     OR (SELECT count(*) FROM jsonb_array_elements(v_vtc_t3p_new))<>(SELECT count(*) FROM jsonb_array_elements(v_taxi_t3p_new))
     OR jsonb_array_length(v_vtc_t3p_new)<>jsonb_array_length(v_vtc_t3p->'questions')+1
     OR jsonb_array_length(v_taxi_t3p_new)<>jsonb_array_length(v_taxi_t3p->'questions')+3 THEN
    RAISE EXCEPTION 't3p_alignment_verification_failed' USING ERRCODE='22023';
  END IF;
  WITH v AS (SELECT q,ord FROM jsonb_array_elements(v_vtc_gestion->'questions') WITH ORDINALITY x(q,ord)),
       t AS (SELECT q,ord FROM jsonb_array_elements(v_taxi_gestion_new) WITH ORDINALITY x(q,ord))
  SELECT bool_and(public.bilan_alignment_canonical(v.q)=public.bilan_alignment_canonical(t.q)) INTO v_same
    FROM v JOIN t USING(ord);
  IF NOT COALESCE(v_same,false)
     OR (SELECT count(*) FROM jsonb_array_elements(v_vtc_gestion->'questions'))<>(SELECT count(*) FROM jsonb_array_elements(v_taxi_gestion_new)) THEN
    RAISE EXCEPTION 'gestion_alignment_verification_failed' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.bilan_alignment_archives(operation,object_type,object_key,previous_value)
  SELECT v_op,'module_editor_state',module_id::text,to_jsonb(m) FROM public.module_editor_state m WHERE module_id IN(5,11);

  -- Le drapeau existant empêche toute propagation hors des quatre banques visées.
  PERFORM set_config('app.shared_exercice_sync','1',true);
  v_data5 := public.bilan_alignment_set_questions(v_data5,500,v_vtc_t3p_new);
  v_data5 := public.bilan_alignment_set_questions(v_data5,501,v_vtc_gestion->'questions');
  v_data11 := public.bilan_alignment_set_questions(v_data11,600,v_taxi_t3p_new);
  v_data11 := public.bilan_alignment_set_questions(v_data11,601,v_taxi_gestion_new);
  UPDATE public.module_editor_state SET module_data=v_data5,updated_at=clock_timestamp() WHERE module_id=5;
  UPDATE public.module_editor_state SET module_data=v_data11,updated_at=clock_timestamp() WHERE module_id=11;

  SELECT module_data INTO v_data5 FROM public.module_editor_state WHERE module_id=5;
  SELECT module_data INTO v_data11 FROM public.module_editor_state WHERE module_id=11;
  UPDATE public.bilan_alignment_archives a SET new_value=to_jsonb(m)
    FROM public.module_editor_state m
   WHERE a.operation=v_op AND a.object_type='module_editor_state' AND a.object_key=m.module_id::text;

  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_data5->'exercices') e,jsonb_array_elements(e->'questions') q
             WHERE e->>'id'='500' AND q->>'uid' IS NULL)
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_data11->'exercices') e,jsonb_array_elements(e->'questions') q
                WHERE e->>'id' IN('600','601') AND q->>'uid' IS NULL) THEN
    RAISE EXCEPTION 'new_question_identity_missing' USING ERRCODE='P0497';
  END IF;

  SELECT e INTO v_vtc_t3p FROM jsonb_array_elements(v_data5->'exercices') e WHERE e->>'id'='500';
  SELECT jsonb_agg(public.bilan_alignment_future(q) ORDER BY ord) INTO v_future0
    FROM jsonb_array_elements(v_vtc_t3p->'questions') WITH ORDINALITY x(q,ord);
  SELECT e INTO v_vtc_gestion FROM jsonb_array_elements(v_data5->'exercices') e WHERE e->>'id'='501';
  SELECT jsonb_agg(public.bilan_alignment_future(q) ORDER BY ord) INTO v_future1
    FROM jsonb_array_elements(v_vtc_gestion->'questions') WITH ORDINALITY x(q,ord);

  SELECT COALESCE((SELECT version_id FROM public.bilan_future_common_releases WHERE subject=0 ORDER BY activated_at DESC,id DESC LIMIT 1),
                  (SELECT version_id FROM public.bilan_future_active WHERE subject=0)) INTO v_previous0;
  SELECT COALESCE((SELECT version_id FROM public.bilan_future_common_releases WHERE subject=1 ORDER BY activated_at DESC,id DESC LIMIT 1),
                  (SELECT version_id FROM public.bilan_future_active WHERE subject=1)) INTO v_previous1;
  INSERT INTO public.bilan_future_versions(subject,questions,fingerprint) VALUES(0,v_future0,md5(v_future0::text)) RETURNING id INTO v_version0;
  INSERT INTO public.bilan_future_versions(subject,questions,fingerprint) VALUES(1,v_future1,md5(v_future1::text)) RETURNING id INTO v_version1;
  INSERT INTO public.bilan_future_common_releases(subject,version_id) VALUES(0,v_version0),(1,v_version1);
  INSERT INTO public.bilan_alignment_archives(operation,object_type,object_key,previous_value,new_value) VALUES
    (v_op,'future_release','0',jsonb_build_object('version_id',v_previous0),jsonb_build_object('version_id',v_version0,'questions',jsonb_array_length(v_future0))),
    (v_op,'future_release','1',jsonb_build_object('version_id',v_previous1),jsonb_build_object('version_id',v_version1,'questions',jsonb_array_length(v_future1)));

  RETURN jsonb_build_object('statut','applique','nouvel_id_vtc_taxi_q59',v_new_vtc_id,
    't3p_questions',jsonb_array_length(v_future0),'gestion_questions',jsonb_array_length(v_future1),
    'version_t3p',v_version0,'version_gestion',v_version1);
END $function$;

REVOKE ALL ON FUNCTION public.bilan_alignment_canonical(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bilan_alignment_future(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bilan_alignment_set_questions(jsonb,integer,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.run_bilan_t3p_gestion_alignment_20261108(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bilan_alignment_canonical(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bilan_alignment_future(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bilan_alignment_set_questions(jsonb,integer,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_bilan_t3p_gestion_alignment_20261108(jsonb) TO service_role;
