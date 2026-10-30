-- Dedicated optional practice only; no official answers, grades or module writes.
CREATE TABLE public.qrc_practice_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, quiz text NOT NULL CHECK(quiz IN ('complet','specialites')),
 version text NOT NULL, manifest jsonb NOT NULL DEFAULT '[]', revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), saved_at timestamptz, submitted_at timestamptz,
 submitted_answers jsonb, submit_operation uuid, opening_operation uuid NOT NULL UNIQUE
);
GRANT SELECT ON public.qrc_practice_attempts TO authenticated;
GRANT ALL ON public.qrc_practice_attempts TO service_role;
ALTER TABLE public.qrc_practice_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_practice_owner ON public.qrc_practice_attempts FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE UNIQUE INDEX qrc_practice_one_draft ON public.qrc_practice_attempts(owner_id,quiz) WHERE submitted_at IS NULL;
CREATE TABLE public.qrc_practice_answer_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES public.qrc_practice_attempts(id),
 question_key text NOT NULL, revision integer NOT NULL, answer jsonb NOT NULL, operation_id uuid NOT NULL UNIQUE,
 saved_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(attempt_id,revision)
);
GRANT SELECT ON public.qrc_practice_answer_events TO authenticated;
GRANT ALL ON public.qrc_practice_answer_events TO service_role;
ALTER TABLE public.qrc_practice_answer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_practice_events_owner ON public.qrc_practice_answer_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.qrc_practice_attempts a WHERE a.id=attempt_id AND a.owner_id=auth.uid()));
CREATE INDEX qrc_practice_events_latest ON public.qrc_practice_answer_events(attempt_id,question_key,revision DESC);

CREATE FUNCTION public.qrc_practice_access(p_quiz text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND p_quiz IN ('complet','specialites') AND (
  coalesce(public.has_role(auth.uid(),'admin'),false) OR EXISTS(
   SELECT 1 FROM public.apprenants a WHERE a.auth_user_id=auth.uid() AND a.deleted_at IS NULL AND a.compte_cours_archive_at IS NULL
   AND NOT coalesce(a.abandonnee,false) AND (11=ANY(a.modules_autorises) OR (p_quiz='specialites' AND 28=ANY(a.modules_autorises)))
   AND ((timezone('Europe/Paris',now())::date BETWEEN a.date_debut_cours_en_ligne AND a.date_fin_cours_en_ligne)
        OR coalesce((public.crm_lire_extension_acces(a.id)->>'autorise')::boolean,false))
  )
 );
$$;
CREATE FUNCTION public.qrc_practice_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='qrc_practice_answer_events' OR TG_OP='DELETE' THEN RAISE EXCEPTION 'Historique conservé' USING ERRCODE='42501'; END IF;
 IF OLD.submitted_at IS NOT NULL OR NEW.owner_id<>OLD.owner_id OR NEW.quiz<>OLD.quiz OR NEW.version<>OLD.version OR NEW.manifest<>OLD.manifest
 OR NEW.opening_operation<>OLD.opening_operation THEN RAISE EXCEPTION 'Tentative figée' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER qrc_practice_attempt_guard BEFORE UPDATE OR DELETE ON public.qrc_practice_attempts FOR EACH ROW EXECUTE FUNCTION public.qrc_practice_immutable();
CREATE TRIGGER qrc_practice_event_guard BEFORE UPDATE OR DELETE ON public.qrc_practice_answer_events FOR EACH ROW EXECUTE FUNCTION public.qrc_practice_immutable();

CREATE FUNCTION public.qrc_practice_answer_valid(p_rule jsonb,p_answer jsonb,p_complete boolean DEFAULT true) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE kind text:=p_rule->>'kind'; v text; n integer;
BEGIN
 IF p_answer IS NULL THEN RETURN false; END IF;
 IF kind='choice' THEN RETURN jsonb_typeof(p_answer)='string' AND ((NOT p_complete AND p_answer='""') OR (p_rule->'options') @> jsonb_build_array(p_answer)); END IF;
 IF kind='choices' THEN
  IF jsonb_typeof(p_answer)<>'array' THEN RETURN false; END IF;
  RETURN (NOT p_complete OR jsonb_array_length(p_answer)>0)
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_answer) x WHERE jsonb_typeof(x)<>'string' OR NOT (p_rule->'options') @> jsonb_build_array(x))
    AND (SELECT count(DISTINCT x) FROM jsonb_array_elements(p_answer) x)=jsonb_array_length(p_answer);
 END IF;
 IF jsonb_typeof(p_answer)<>'string' THEN RETURN false; END IF;
 v:=p_answer#>>'{}';
 IF length(v)>CASE WHEN kind='text' THEN 4000 ELSE 8000 END THEN RETURN false; END IF;
 IF NOT p_complete THEN RETURN true; END IF;
 IF v !~ '[^[:space:]]' THEN RETURN false; END IF;
 IF kind='list' THEN
  SELECT count(DISTINCT lower(btrim(x))) INTO n FROM regexp_split_to_table(v,E'[\\n,;/•]+') x WHERE x ~ '[^[:space:]]';
  RETURN n>=coalesce((p_rule->>'min')::int,1);
 END IF;
 RETURN kind='text';
END $$;

-- Replaced before deployment with a server-owned constant generated from untouched source data.
CREATE FUNCTION public.qrc_practice_manifest(p_quiz text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT '[]'::jsonb; $$;

CREATE FUNCTION public.qrc_practice_read(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; ans jsonb; meta jsonb;
BEGIN
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE id=p_attempt AND owner_id=auth.uid();
 IF a.id IS NULL THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_object_agg(question_key,answer),'{}'),coalesce(jsonb_object_agg(question_key,jsonb_build_object('saved_at',saved_at,'revision',revision)),'{}') INTO ans,meta
 FROM (SELECT DISTINCT ON(question_key) * FROM public.qrc_practice_answer_events WHERE attempt_id=a.id ORDER BY question_key,revision DESC) e;
 RETURN jsonb_build_object('id',a.id,'owner',a.owner_id,'quiz',a.quiz,'version',a.version,'manifest',a.manifest,'revision',a.revision,
 'answers',coalesce(a.submitted_answers,ans),'answer_meta',meta,'saved_at',a.saved_at,'submitted_at',a.submitted_at,'submit_operation',a.submit_operation);
END $$;

CREATE FUNCTION public.qrc_practice_open(p_quiz text,p_operation uuid,p_new boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; m jsonb;
BEGIN
 IF NOT public.qrc_practice_access(p_quiz) THEN RAISE EXCEPTION 'Entraînement non accessible' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL THEN RAISE EXCEPTION 'Identité requise' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('qrc-practice:'||auth.uid()||':'||p_quiz,0));
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE opening_operation=p_operation;
 IF a.id IS NOT NULL THEN
  IF a.owner_id<>auth.uid() OR a.quiz<>p_quiz THEN RAISE EXCEPTION 'Identité différente' USING ERRCODE='42501'; END IF;
  RETURN public.qrc_practice_read(a.id);
 END IF;
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE owner_id=auth.uid() AND quiz=p_quiz AND (NOT p_new OR submitted_at IS NULL) ORDER BY created_at DESC LIMIT 1;
 IF a.id IS NOT NULL THEN RETURN public.qrc_practice_read(a.id); END IF;
 m:=public.qrc_practice_manifest(p_quiz);
 IF jsonb_array_length(m)=0 THEN RAISE EXCEPTION 'Références indisponibles' USING ERRCODE='22023'; END IF;
 INSERT INTO public.qrc_practice_attempts(owner_id,quiz,version,manifest,opening_operation) VALUES(auth.uid(),p_quiz,'taxi-optional-durable-v1',m,p_operation) RETURNING * INTO a;
 RETURN public.qrc_practice_read(a.id);
END $$;

CREATE FUNCTION public.qrc_practice_save(p_attempt uuid,p_expected integer,p_key text,p_answer jsonb,p_operation uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; e public.qrc_practice_answer_events; rule jsonb;
BEGIN
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE id=p_attempt AND owner_id=auth.uid() FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.qrc_practice_answer_events WHERE operation_id=p_operation;
 IF e.id IS NOT NULL THEN
  IF e.attempt_id<>a.id OR e.question_key<>p_key OR e.answer<>p_answer THEN RAISE EXCEPTION 'Opération différente' USING ERRCODE='22023'; END IF;
  RETURN public.qrc_practice_read(a.id);
 END IF;
 IF NOT public.qrc_practice_access(a.quiz) THEN RAISE EXCEPTION 'Accès expiré ou refusé' USING ERRCODE='42501'; END IF;
 IF a.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Tentative déjà soumise' USING ERRCODE='42501'; END IF;
 IF a.revision<>p_expected THEN RAISE EXCEPTION 'Une autre sauvegarde existe : relire avant de choisir' USING ERRCODE='40001'; END IF;
 SELECT x INTO rule FROM jsonb_array_elements(a.manifest) x WHERE x->>'key'=p_key;
 IF rule IS NULL OR p_operation IS NULL OR NOT public.qrc_practice_answer_valid(rule,p_answer,false) THEN RAISE EXCEPTION 'Réponse invalide ou inconnue' USING ERRCODE='22023'; END IF;
 INSERT INTO public.qrc_practice_answer_events(attempt_id,question_key,revision,answer,operation_id) VALUES(a.id,p_key,a.revision+1,p_answer,p_operation);
 UPDATE public.qrc_practice_attempts SET revision=revision+1,saved_at=clock_timestamp() WHERE id=a.id;
 RETURN public.qrc_practice_read(a.id);
END $$;

CREATE FUNCTION public.qrc_practice_submit(p_attempt uuid,p_expected integer,p_operation uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.qrc_practice_attempts; r jsonb; missing jsonb;
BEGIN
 SELECT * INTO a FROM public.qrc_practice_attempts WHERE id=p_attempt AND owner_id=auth.uid() FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 IF a.submitted_at IS NOT NULL THEN
  IF a.submit_operation IS DISTINCT FROM p_operation THEN RAISE EXCEPTION 'Tentative déjà soumise' USING ERRCODE='42501'; END IF;
  RETURN public.qrc_practice_read(a.id);
 END IF;
 IF NOT public.qrc_practice_access(a.quiz) THEN RAISE EXCEPTION 'Accès expiré ou refusé' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR a.revision<>p_expected THEN RAISE EXCEPTION 'Sauvegardes modifiées : relire avant soumission' USING ERRCODE='40001'; END IF;
 r:=public.qrc_practice_read(a.id);
 SELECT coalesce(jsonb_agg(x),'[]') INTO missing FROM jsonb_array_elements(a.manifest) x WHERE NOT public.qrc_practice_answer_valid(x,r->'answers'->(x->>'key'));
 IF jsonb_array_length(missing)>0 THEN RETURN r||jsonb_build_object('missing',missing); END IF;
 UPDATE public.qrc_practice_attempts SET submitted_at=clock_timestamp(),submitted_answers=r->'answers',submit_operation=p_operation WHERE id=a.id;
 RETURN public.qrc_practice_read(a.id);
END $$;

REVOKE ALL ON FUNCTION public.qrc_practice_access(text),public.qrc_practice_immutable(),public.qrc_practice_answer_valid(jsonb,jsonb,boolean),public.qrc_practice_manifest(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.qrc_practice_open(text,uuid,boolean),public.qrc_practice_read(uuid),public.qrc_practice_save(uuid,integer,text,jsonb,uuid),public.qrc_practice_submit(uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qrc_practice_open(text,uuid,boolean),public.qrc_practice_read(uuid),public.qrc_practice_save(uuid,integer,text,jsonb,uuid),public.qrc_practice_submit(uuid,integer,uuid) TO authenticated;
COMMENT ON TABLE public.qrc_practice_attempts IS 'Optional QRC TAXI practice only; no official completion, grade or milestone bridge.';