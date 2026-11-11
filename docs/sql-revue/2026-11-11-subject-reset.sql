-- Scoped deferred admin authorization; no learner data backfill or reset.
CREATE TABLE public.exam_subject_reset_authorizations (
 operation_id uuid PRIMARY KEY, apprenant_id uuid NOT NULL, exam_id text NOT NULL,
 filiere text NOT NULL, matiere_id text NOT NULL, source_exercice_id text NOT NULL,
 source_attempt_id uuid, source_result_id uuid, version_token text NOT NULL,
 source_token text NOT NULL, actor uuid NOT NULL, learner_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(apprenant_id,exam_id,matiere_id,source_token,version_token)
);
GRANT SELECT ON public.exam_subject_reset_authorizations TO authenticated;
GRANT ALL ON public.exam_subject_reset_authorizations TO service_role;
ALTER TABLE public.exam_subject_reset_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY subject_reset_read ON public.exam_subject_reset_authorizations FOR SELECT TO authenticated
 USING(public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subject_reset_immutable BEFORE UPDATE OR DELETE ON public.exam_subject_reset_authorizations
 FOR EACH ROW EXECUTE FUNCTION public.exam_subject_retake_immutable();

CREATE FUNCTION public.exam_subject_reset_context(p_apprenant_id uuid,p_exam_id text,p_matiere_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 subject jsonb; whole jsonb; v_version_token text; track text; learner public.apprenants;
 result public.apprenant_quiz_results; answer public.reponses_apprenants; timer public.apprenant_examen_timers;
 attempt public.exam_attempts_v2; source_key text; source_attempt uuid;
 n integer; matched integer; status text; reason text; v_source_token text; grant_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.core_est_proprietaire(p_apprenant_id) OR public.has_role(auth.uid(),'admin')) THEN
  RAISE EXCEPTION 'Droits insuffisants.' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT learner FROM public.apprenants WHERE id=p_apprenant_id;
 track:=CASE WHEN p_exam_id ~ '^EB[1-6]$' THEN 'vtc' WHEN p_exam_id ~ '^EB[1-6]-TAXI$' THEN 'taxi'
  WHEN p_exam_id ~ '^eb[1-6]-ta$' THEN 'ta' WHEN p_exam_id ~ '^eb[1-6]-va$' THEN 'va' ELSE NULL END;
 IF track IS NULL THEN RAISE EXCEPTION 'Examen ou filière non supporté.' USING ERRCODE='P0482'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.examens_blancs_parcours p WHERE p.exam_id=p_exam_id
   AND p.module_id=ANY(coalesce(learner.modules_autorises,ARRAY[]::integer[])))
   AND NOT EXISTS(SELECT 1 FROM public.apprenant_quiz_results q WHERE q.apprenant_id=p_apprenant_id AND q.quiz_id=p_exam_id AND q.quiz_type='examen_blanc')
   AND NOT EXISTS(SELECT 1 FROM public.reponses_apprenants r WHERE r.apprenant_id=p_apprenant_id AND r.exercice_type='examen_blanc' AND split_part(r.exercice_id,'__',1)=p_exam_id)
   AND NOT EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id) THEN
  RAISE EXCEPTION 'Attribution de cet examen non prouvée ; aucune ouverture hors parcours.' USING ERRCODE='42501'; END IF;
 SELECT count(*),jsonb_agg(module_data)->0 INTO n,whole FROM public.module_editor_state WHERE module_data->>'id'=p_exam_id;
 IF n<>1 THEN RAISE EXCEPTION 'Composition officielle absente ou ambiguë.' USING ERRCODE='P0487'; END IF;
 SELECT count(*),jsonb_agg(m)->0 INTO n,subject FROM jsonb_array_elements(whole->'matieres') m WHERE m->>'id'=p_matiere_id;
 IF n<>1 OR coalesce(jsonb_array_length(subject->'questions'),0)=0 OR (subject->>'duree')::integer<=0 THEN
  RAISE EXCEPTION 'Matière officielle absente ou incomplète.' USING ERRCODE='P0487'; END IF;
 v_version_token:=md5(whole::text||coalesce((SELECT v.fingerprint FROM public.exam_content_versions v WHERE v.exam_id=p_exam_id AND v.statut='publiee' ORDER BY v.version_number DESC LIMIT 1),''));
 SELECT * INTO result FROM public.apprenant_quiz_results WHERE apprenant_id=p_apprenant_id AND quiz_id=p_exam_id
  AND matiere_id=p_matiere_id AND quiz_type='examen_blanc' ORDER BY tentative DESC,completed_at DESC,id LIMIT 1;
 SELECT * INTO answer FROM public.reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_type='examen_blanc'
  AND split_part(exercice_id,'__',1)=p_exam_id AND split_part(exercice_id,'__',2)=p_matiere_id
  ORDER BY greatest(tentative,coalesce(substring(exercice_id FROM '__t([0-9]+)$')::integer,1)) DESC,id LIMIT 1;
 SELECT * INTO timer FROM public.apprenant_examen_timers WHERE apprenant_id=p_apprenant_id
  AND split_part(exercice_id,'__',1)=p_exam_id AND split_part(exercice_id,'__',2)=p_matiere_id
  ORDER BY tentative DESC,started_at DESC,id LIMIT 1;
 SELECT count(*) INTO n FROM public.exam_attempts_v2 WHERE apprenant_id=p_apprenant_id AND exam_id=p_exam_id
  AND (snapshot->>'matiere'=p_matiere_id OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(snapshot->'questions','[]')) q WHERE q->>'matiere'=p_matiere_id));
 source_key:=coalesce(answer.exercice_id,timer.exercice_id,
  result.details->>'source_exercice_id',p_exam_id||'__'||p_matiere_id||CASE WHEN result.tentative>1 THEN '__t'||result.tentative ELSE '' END);
 IF source_key IS NULL OR split_part(source_key,'__',1)<>p_exam_id OR split_part(source_key,'__',2)<>p_matiere_id THEN
  RAISE EXCEPTION 'Identité source contradictoire.' USING ERRCODE='P0482'; END IF;
 IF answer.id IS NOT NULL AND timer.id IS NOT NULL AND answer.exercice_id<>timer.exercice_id THEN
  RAISE EXCEPTION 'Réponse et chronomètre de passages différents ; revue manuelle requise.' USING ERRCODE='P0482'; END IF;
 IF result.id IS NOT NULL AND answer.id IS NOT NULL AND result.tentative>coalesce(substring(source_key FROM '__t([0-9]+)$')::integer,1) THEN
  RAISE EXCEPTION 'Résultat et réponse de passages différents ; revue manuelle requise.' USING ERRCODE='P0482'; END IF;
 -- V2 proof: explicit receipt, immutable imported result id, or sole native first copy.
 IF n>0 THEN
  SELECT a.* INTO attempt FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id
   AND (a.snapshot->>'matiere'=p_matiere_id OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(a.snapshot->'questions','[]')) q WHERE q->>'matiere'=p_matiere_id))
   AND (EXISTS(SELECT 1 FROM public.exam_subject_retakes r WHERE r.apprenant_id=p_apprenant_id AND r.exercice_id=source_key AND r.attempt_id=a.attempt_id)
    OR (result.id IS NOT NULL AND a.snapshot->'source_historique'->>'result_id'=result.id::text
      AND result.tentative=coalesce(substring(source_key FROM '__t([0-9]+)$')::integer,1))
    OR (n=1 AND source_key=p_exam_id||'__'||p_matiere_id AND a.snapshot->>'matiere'=p_matiere_id
        AND NOT a.snapshot ? 'source_historique' AND NOT a.snapshot ? 'subject_retake_source'));
  SELECT count(*) INTO matched FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id
   AND (a.snapshot->>'matiere'=p_matiere_id OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(a.snapshot->'questions','[]')) q WHERE q->>'matiere'=p_matiere_id))
   AND (EXISTS(SELECT 1 FROM public.exam_subject_retakes r WHERE r.apprenant_id=p_apprenant_id AND r.exercice_id=source_key AND r.attempt_id=a.attempt_id)
    OR (result.id IS NOT NULL AND a.snapshot->'source_historique'->>'result_id'=result.id::text
      AND result.tentative=coalesce(substring(source_key FROM '__t([0-9]+)$')::integer,1))
    OR (n=1 AND source_key=p_exam_id||'__'||p_matiere_id AND a.snapshot->>'matiere'=p_matiere_id
        AND NOT a.snapshot ? 'source_historique' AND NOT a.snapshot ? 'subject_retake_source'));
  IF matched<>1 THEN attempt.attempt_id:=NULL; END IF;
  source_attempt:=attempt.attempt_id;
 END IF;
 status:=CASE
  WHEN n>0 AND source_attempt IS NULL THEN 'ambigu'
  WHEN EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id
    AND a.snapshot->>'matiere'=p_matiere_id AND a.etat='en_cours') THEN 'en_cours'
  WHEN answer.id IS NOT NULL AND NOT coalesce(answer.completed,false) AND answer.status IS DISTINCT FROM 'submitted'
    AND (timer.id IS NULL OR now()<timer.started_at+make_interval(secs=>timer.duree_secondes)) THEN 'en_cours'
  WHEN timer.id IS NOT NULL AND now()<timer.started_at+make_interval(secs=>timer.duree_secondes)
    AND result.id IS NULL AND NOT coalesce(answer.completed,false) THEN 'en_cours'
  WHEN result.id IS NULL AND answer.id IS NULL AND timer.id IS NULL AND n=0 THEN 'non_commencee'
  WHEN result.id IS NULL THEN 'en_attente'
  ELSE 'notee' END;
 reason:=CASE status WHEN 'ambigu' THEN 'Correspondance ancien/V2 non prouvée ; revue manuelle requise.'
  WHEN 'en_cours' THEN 'Une copie est en cours ; reprenez-la sans la remplacer.' ELSE NULL END;
 IF result.id IS NOT NULL AND answer.id IS NULL AND timer.id IS NULL AND source_attempt IS NULL THEN
  status:='ambigu';reason:='Résultat sans preuve de remise ni chronomètre ; revue manuelle requise.'; END IF;
 v_source_token:=md5(jsonb_build_object('source',source_key,'attempt',source_attempt,'result',result.id,
  'answer_id',answer.id,'timer_id',timer.id)::text);
 SELECT a.operation_id INTO grant_id FROM public.exam_subject_reset_authorizations a
  WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id AND a.matiere_id=p_matiere_id
   AND a.source_token=v_source_token AND a.version_token=v_version_token
   AND NOT EXISTS(SELECT 1 FROM public.exam_subject_retakes r WHERE r.authorization_id=a.operation_id);
 RETURN jsonb_build_object('apprenant_id',p_apprenant_id,'exam_id',p_exam_id,'filiere',track,'matiere_id',p_matiere_id,
  'learner_name',trim(learner.prenom||' '||learner.nom),'subject_name',subject->>'nom','status',status,'reason',reason,
  'source_exercice_id',source_key,'source_attempt_id',source_attempt,'source_result_id',result.id,
  'source_token',v_source_token,'version_token',v_version_token,'authorization_id',grant_id);
END $$;
REVOKE ALL ON FUNCTION public.exam_subject_reset_context(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.exam_subject_reset_context(uuid,text,text) TO authenticated;

CREATE FUNCTION public.admin_authorize_exam_subject_reset(p_operation_id uuid,p_apprenant_id uuid,p_exam_id text,
 p_filiere text,p_matiere_id text,p_learner_name text,p_source_token text,p_version_token text)
RETURNS public.exam_subject_reset_authorizations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; r public.exam_subject_reset_authorizations;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Action réservée à l’administration.' USING ERRCODE='42501'; END IF;
 IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Opération absente.' USING ERRCODE='P0482'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('subject-retake:'||p_apprenant_id||':'||p_exam_id,0));
 SELECT * INTO r FROM public.exam_subject_reset_authorizations WHERE operation_id=p_operation_id;
 IF FOUND THEN
  IF r.apprenant_id<>p_apprenant_id OR r.exam_id<>p_exam_id OR r.filiere<>p_filiere OR r.matiere_id<>p_matiere_id
   OR r.learner_name<>p_learner_name OR r.source_token<>p_source_token OR r.version_token<>p_version_token THEN
   RAISE EXCEPTION 'Opération liée à une autre identité.' USING ERRCODE='P0482'; END IF; RETURN r; END IF;
 c:=public.exam_subject_reset_context(p_apprenant_id,p_exam_id,p_matiere_id);
 IF c->>'filiere' IS DISTINCT FROM p_filiere OR c->>'learner_name' IS DISTINCT FROM p_learner_name
  OR c->>'source_token' IS DISTINCT FROM p_source_token OR c->>'version_token' IS DISTINCT FROM p_version_token THEN
  RAISE EXCEPTION 'Identité ou version modifiée ; relisez avant confirmation.' USING ERRCODE='P0482'; END IF;
 IF c->>'status' IN ('ambigu','en_cours') THEN RAISE EXCEPTION '%',c->>'reason' USING ERRCODE='P0478'; END IF;
 INSERT INTO public.exam_subject_reset_authorizations(operation_id,apprenant_id,exam_id,filiere,matiere_id,
  source_exercice_id,source_attempt_id,source_result_id,version_token,source_token,actor,learner_name)
 VALUES(p_operation_id,p_apprenant_id,p_exam_id,p_filiere,p_matiere_id,c->>'source_exercice_id',
  (c->>'source_attempt_id')::uuid,(c->>'source_result_id')::uuid,p_version_token,p_source_token,auth.uid(),p_learner_name)
 ON CONFLICT(apprenant_id,exam_id,matiere_id,source_token,version_token) DO NOTHING RETURNING * INTO r;
 IF r.operation_id IS NULL THEN SELECT * INTO r FROM public.exam_subject_reset_authorizations
  WHERE apprenant_id=p_apprenant_id AND exam_id=p_exam_id AND matiere_id=p_matiere_id AND source_token=p_source_token AND version_token=p_version_token; END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_authorize_exam_subject_reset(uuid,uuid,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_authorize_exam_subject_reset(uuid,uuid,text,text,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.start_exam_subject_retake(p_operation_id uuid, p_apprenant_id uuid, p_exam_id text, p_matiere_id text, p_source_exercice_id text, p_source_attempt_id uuid DEFAULT NULL::uuid)
 RETURNS exam_subject_retakes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receipt public.exam_subject_retakes;
  old_attempt public.exam_attempts_v2;
  new_attempt public.exam_attempts_v2;
  answer public.reponses_apprenants;
  timer public.apprenant_examen_timers;
  subject jsonb;
  closed_at timestamptz;
  last_closed timestamptz;
  v_authorization uuid;
  next_number integer;
  new_key text;
  engine text := 'ancien';
  duration_seconds integer;
  source_number integer;
  context jsonb;
  scoped public.exam_subject_reset_authorizations;
  published public.exam_content_versions;
  fresh_snapshot jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.core_est_proprietaire(p_apprenant_id) THEN
    RAISE EXCEPTION 'Session ou droits insuffisants pour refaire cette matière.' USING ERRCODE='42501';
  END IF;
  PERFORM public.core_assert_session_owner(p_apprenant_id);
  IF p_operation_id IS NULL OR p_source_exercice_id IS NULL OR p_matiere_id IS NULL OR p_exam_id IS NULL
     OR p_exam_id !~* '^(EB[1-6](-TAXI)?|eb[1-6]-(ta|va))$'
     OR p_matiere_id !~ '^[a-zA-Z0-9_-]+$'
     OR NOT (p_source_exercice_id=p_exam_id||'__'||p_matiere_id
       OR (split_part(p_source_exercice_id,'__',1)=p_exam_id
           AND split_part(p_source_exercice_id,'__',2)=p_matiere_id
           AND split_part(p_source_exercice_id,'__',3) ~ '^t[0-9]+$'
           AND array_length(string_to_array(p_source_exercice_id,'__'),1)=3)) THEN
    RAISE EXCEPTION 'Identité du passage non prouvée.' USING ERRCODE='P0482';
  END IF;
  -- Serialize all retakes for this learner/exam: unique numeric projection, atomic authorization.
  PERFORM pg_advisory_xact_lock(hashtextextended('subject-retake:'||p_apprenant_id||':'||p_exam_id,0));
  SELECT * INTO receipt FROM public.exam_subject_retakes WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF receipt.apprenant_id<>p_apprenant_id OR receipt.exam_id<>p_exam_id
       OR receipt.matiere_id<>p_matiere_id OR receipt.source_exercice_id<>p_source_exercice_id
       OR receipt.source_attempt_id IS DISTINCT FROM p_source_attempt_id THEN
      RAISE EXCEPTION 'Opération déjà liée à un autre passage.' USING ERRCODE='P0482';
    END IF;
    RETURN receipt;
  END IF;
  SELECT * INTO receipt FROM public.exam_subject_retakes
    WHERE apprenant_id=p_apprenant_id AND exam_id=p_exam_id AND matiere_id=p_matiere_id
      AND source_exercice_id=p_source_exercice_id
      AND exercice_id<>source_exercice_id;
  IF FOUND THEN
    IF receipt.source_attempt_id IS DISTINCT FROM p_source_attempt_id THEN
      RAISE EXCEPTION 'Identité du passage différente.' USING ERRCODE='P0482';
    END IF;
    RETURN receipt;
  END IF;
  context := public.exam_subject_reset_context(p_apprenant_id,p_exam_id,p_matiere_id);
  IF context->>'source_exercice_id' IS DISTINCT FROM p_source_exercice_id
     OR nullif(context->>'source_attempt_id','')::uuid IS DISTINCT FROM p_source_attempt_id THEN
    RAISE EXCEPTION 'Le passage source a changé ; relisez cette matière.' USING ERRCODE='P0482';
  END IF;
  IF context->>'status' IN ('en_cours','ambigu') THEN
    RAISE EXCEPTION '%', context->>'reason' USING ERRCODE='P0478';
  END IF;
  SELECT a.* INTO scoped FROM public.exam_subject_reset_authorizations a
    WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id AND a.matiere_id=p_matiere_id
      AND a.source_exercice_id=p_source_exercice_id
      AND a.source_attempt_id IS NOT DISTINCT FROM p_source_attempt_id
      AND a.version_token=context->>'version_token'
      AND NOT EXISTS (SELECT 1 FROM public.exam_subject_retakes r WHERE r.authorization_id=a.operation_id)
    ORDER BY a.created_at DESC LIMIT 1;
  SELECT e INTO STRICT subject FROM public.module_editor_state m,
    LATERAL jsonb_array_elements(coalesce(m.module_data->'matieres','[]'::jsonb)) e
    WHERE m.module_data->>'id'=p_exam_id AND e->>'id'=p_matiere_id;
  IF subject IS NULL OR jsonb_array_length(coalesce(subject->'questions','[]'::jsonb))=0 THEN
    RAISE EXCEPTION 'Sujet officiel indisponible ; aucune reprise créée.' USING ERRCODE='P0487';
  END IF;
  duration_seconds := (subject->>'duree')::integer * 60;
  IF duration_seconds IS NULL OR duration_seconds<=0 THEN
    RAISE EXCEPTION 'Durée officielle indisponible.' USING ERRCODE='P0487';
  END IF;
  SELECT * INTO answer FROM public.reponses_apprenants
    WHERE apprenant_id=p_apprenant_id AND exercice_id=p_source_exercice_id;
  SELECT * INTO timer FROM public.apprenant_examen_timers
    WHERE apprenant_id=p_apprenant_id AND exercice_id=p_source_exercice_id ORDER BY tentative DESC LIMIT 1;
  IF answer.completed IS TRUE OR answer.status='submitted' THEN
    closed_at := coalesce(answer.submitted_at,answer.updated_at);
  END IF;
  IF timer.id IS NOT NULL AND now()>=timer.started_at+make_interval(secs=>timer.duree_secondes) THEN
    closed_at := coalesce(closed_at,timer.started_at+make_interval(secs=>timer.duree_secondes));
  END IF;
  IF p_source_attempt_id IS NOT NULL THEN
    SELECT * INTO old_attempt FROM public.exam_attempts_v2 WHERE attempt_id=p_source_attempt_id FOR UPDATE;
    IF NOT FOUND OR old_attempt.apprenant_id<>p_apprenant_id OR old_attempt.exam_id<>p_exam_id
       OR coalesce(old_attempt.snapshot->>'matiere',p_matiere_id)<>p_matiere_id THEN
      RAISE EXCEPTION 'Le passage ne correspond pas à cette matière et à ce compte.' USING ERRCODE='42501';
    END IF;
    IF old_attempt.etat IS DISTINCT FROM 'terminee' OR old_attempt.finished_at IS NULL THEN
      RAISE EXCEPTION 'Clôture du passage serveur non prouvée ; reprenez la copie existante.' USING ERRCODE='P0478';
    END IF;
    closed_at:=old_attempt.finished_at;
    IF jsonb_array_length(coalesce(old_attempt.snapshot->'questions','[]'))=0
       OR jsonb_array_length(coalesce(old_attempt.snapshot->'matieres','[]'))<>1 THEN
      RAISE EXCEPTION 'Copie figée incomplète ; revue manuelle requise.' USING ERRCODE='P0487';
    END IF;
    engine:='v2';
  ELSIF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id
      AND a.snapshot->>'matiere'=p_matiere_id) THEN
    RAISE EXCEPTION 'Identifiant du passage serveur requis ; contactez l’administration.' USING ERRCODE='P0482';
  END IF;
  IF closed_at IS NULL AND context->>'status'<>'non_commencee' THEN
    RAISE EXCEPTION 'Cette matière est encore en cours ; reprenez sa copie existante.' USING ERRCODE='P0478';
  END IF;
  IF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id
      AND a.exam_id=p_exam_id AND a.snapshot->>'matiere'=p_matiere_id AND a.etat='en_cours'
      AND a.attempt_id IS DISTINCT FROM p_source_attempt_id) THEN
    RAISE EXCEPTION 'Une autre copie de cette matière est en cours ; aucun doublon créé.' USING ERRCODE='P0478';
  END IF;
  SELECT greatest(closed_at,
    (SELECT max(coalesce(r.submitted_at,r.updated_at)) FROM public.reponses_apprenants r
      WHERE r.apprenant_id=p_apprenant_id AND r.exercice_type='examen_blanc'
        AND split_part(r.exercice_id,'__',1)=p_exam_id AND r.completed),
    (SELECT max(a.finished_at) FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id AND a.etat='terminee'))
    INTO last_closed;
  IF context->>'status'<>'non_commencee' AND scoped.operation_id IS NULL AND now()<last_closed+interval '48 hours' THEN
    SELECT id INTO v_authorization FROM public.exam_retake_authorizations a WHERE a.apprenant_id=p_apprenant_id
      AND a.exam_id=p_exam_id AND a.consumed_at IS NULL AND a.revoked_at IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE;
    IF v_authorization IS NULL THEN
      RAISE EXCEPTION 'Demandez une autorisation à l’administration, ou attendez 48 heures après la fin du passage (%).',
        to_char((last_closed+interval '48 hours') AT TIME ZONE 'Europe/Paris','DD/MM/YYYY HH24:MI') USING ERRCODE='P0471';
    END IF;
  END IF;
  SELECT greatest(coalesce((SELECT max(greatest(r.tentative,coalesce(nullif(substring(r.exercice_id FROM '__t([0-9]+)$'),'')::integer,1)))
    FROM public.reponses_apprenants r WHERE r.apprenant_id=p_apprenant_id AND split_part(r.exercice_id,'__',1)=p_exam_id),1),
    coalesce((SELECT max(r.tentative) FROM public.exam_subject_retakes r WHERE r.apprenant_id=p_apprenant_id AND r.exam_id=p_exam_id),1),
    coalesce((SELECT max(r.tentative) FROM public.apprenant_quiz_results r WHERE r.apprenant_id=p_apprenant_id AND r.quiz_id=p_exam_id),1))+1 INTO next_number;
  IF context->>'status'='non_commencee' THEN next_number:=1; END IF;
  new_key:=p_exam_id||'__'||p_matiere_id||CASE WHEN next_number=1 THEN '' ELSE '__t'||next_number END;
  SELECT * INTO published FROM public.exam_content_versions
    WHERE exam_id=p_exam_id AND statut='publiee' ORDER BY version_number DESC LIMIT 1;
  IF FOUND THEN
    SELECT jsonb_build_object('exam_id',p_exam_id,'exam_libelle',published.content->>'exam_libelle',
      'filiere',published.filiere,'exam_numero',published.exam_numero,'matiere',p_matiere_id,
      'tentative',next_number,'subject_retake_source',p_source_attempt_id,
      'matieres',(SELECT jsonb_agg(m ORDER BY (m->>'ordre')::int) FROM jsonb_array_elements(published.content->'matieres') m WHERE m->>'subject_id'=p_matiere_id),
      'questions',(SELECT jsonb_agg(q ORDER BY (q->>'ordre')::int) FROM jsonb_array_elements(published.content->'questions') q WHERE q->>'matiere'=p_matiere_id)) INTO fresh_snapshot;
    IF jsonb_array_length(coalesce(fresh_snapshot->'questions','[]'))=0
       OR jsonb_array_length(coalesce(fresh_snapshot->'matieres','[]'))<>1 THEN
      RAISE EXCEPTION 'Version publiée incomplète pour cette matière.' USING ERRCODE='P0487';
    END IF;
    SELECT jsonb_build_object('id',p_matiere_id,'nom',m->>'titre','duree',(m->>'duree')::int,
      'coefficient',(m->>'coefficient')::numeric,'noteSur',(m->>'note_sur')::numeric,
      'noteEliminatoire',(m->>'note_eliminatoire')::numeric,'ptsQCM',m->'pts_qcm','ptsQRC',m->'pts_qrc',
      'questions',(SELECT jsonb_agg((q-'matiere'-'ordre')||jsonb_build_object('id',substring(q->>'id' FROM length(p_matiere_id)+2)::int) ORDER BY (q->>'ordre')::int)
        FROM jsonb_array_elements(fresh_snapshot->'questions')q)) INTO subject
     FROM jsonb_array_elements(fresh_snapshot->'matieres')m;
    duration_seconds:=(subject->>'duree')::int*60;
    IF duration_seconds IS NULL OR duration_seconds<=0 THEN RAISE EXCEPTION 'Durée publiée absente.' USING ERRCODE='P0487'; END IF;
    engine:='v2';
    INSERT INTO public.exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,is_test)
      VALUES(p_apprenant_id,p_exam_id,published.id,fresh_snapshot,md5(fresh_snapshot::text),'en_cours',published.is_test)
      RETURNING * INTO new_attempt;
  ELSIF engine='v2' THEN
    RAISE EXCEPTION 'Aucune version publiée pour ouvrir une nouvelle copie.' USING ERRCODE='P0487';
  END IF;
  -- Receipt exists before the answer INSERT: delay trigger can verify the exact scoped grant.
  INSERT INTO public.exam_subject_retakes(operation_id,apprenant_id,exam_id,matiere_id,source_exercice_id,source_attempt_id,
      attempt_id,exercice_id,tentative,moteur,matiere,authorization_id)
    VALUES(p_operation_id,p_apprenant_id,p_exam_id,p_matiere_id,p_source_exercice_id,p_source_attempt_id,
      new_attempt.attempt_id,new_key,next_number,engine,subject,coalesce(scoped.operation_id,v_authorization)) RETURNING * INTO receipt;
  INSERT INTO public.reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,tentative)
    VALUES(p_apprenant_id,auth.uid(),new_key,'examen_blanc',next_number);
  INSERT INTO public.apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,tentative)
    VALUES(p_apprenant_id,auth.uid(),new_key,duration_seconds,next_number);
  IF v_authorization IS NOT NULL THEN
    UPDATE public.exam_retake_authorizations SET consumed_at=now() WHERE id=v_authorization AND consumed_at IS NULL;
  END IF;
  RETURN receipt;
END $function$

;
CREATE OR REPLACE FUNCTION public.enforce_exam_retake_delay()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exam text;
  v_tent integer;
  v_already_started boolean;
  v_last timestamptz;
  v_auth uuid;
  v_total_matieres integer;
  v_matieres_prec integer;
BEGIN
  IF COALESCE(NEW.exercice_type, '') <> 'examen_blanc' THEN
    RETURN NEW;
  END IF;

  v_exam := split_part(COALESCE(NEW.exercice_id, ''), '__', 1);
  IF v_exam = '' THEN
    RETURN NEW;
  END IF;

  v_tent := GREATEST(
    COALESCE(NULLIF(substring(COALESCE(NEW.exercice_id, '') FROM '_t([0-9]+)$'), '')::int, 1),
    COALESCE(NEW.tentative, 1)
  );

  IF v_tent <= 1 THEN
    RETURN NEW;
  END IF;

  -- Dedicated admin grant applies to ONE receipt/subject/account, never the global path.
  IF EXISTS (SELECT 1 FROM public.exam_subject_retakes r
    JOIN public.exam_subject_reset_authorizations a ON a.operation_id=r.authorization_id
    WHERE r.apprenant_id=NEW.apprenant_id AND r.exercice_id=NEW.exercice_id
      AND r.tentative=v_tent AND a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id
      AND a.matiere_id=r.matiere_id AND a.source_exercice_id=r.source_exercice_id
      AND public.core_est_proprietaire(r.apprenant_id)) THEN RETURN NEW; END IF;

  -- Tentative déjà ouverte (une autre matière du même passage existe) : jamais bloquée
  SELECT EXISTS (
    SELECT 1 FROM public.reponses_apprenants r
    WHERE r.apprenant_id = NEW.apprenant_id
      AND r.exercice_type = 'examen_blanc'
      AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
      AND GREATEST(
            COALESCE(NULLIF(substring(COALESCE(r.exercice_id, '') FROM '_t([0-9]+)$'), '')::int, 1),
            COALESCE(r.tentative, 1)
          ) >= v_tent
  ) INTO v_already_started;

  IF v_already_started THEN
    RETURN NEW;
  END IF;

  -- Nombre de matières que comporte cet examen (observé en base, lecture seule)
  SELECT COUNT(DISTINCT split_part(COALESCE(r.exercice_id, ''), '__', 2))
    INTO v_total_matieres
  FROM public.reponses_apprenants r
  WHERE r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND split_part(COALESCE(r.exercice_id, ''), '__', 2) <> '';

  -- Matières réellement finalisées par l'apprenant sur les tentatives précédentes
  SELECT COUNT(DISTINCT split_part(COALESCE(r.exercice_id, ''), '__', 2))
    INTO v_matieres_prec
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE
    AND split_part(COALESCE(r.exercice_id, ''), '__', 2) <> '';

  -- Tentative précédente incomplète : l'apprenant est encore dans son passage, aucun délai
  IF COALESCE(v_total_matieres, 0) = 0
     OR COALESCE(v_matieres_prec, 0) < v_total_matieres THEN
    RETURN NEW;
  END IF;

  SELECT MAX(COALESCE(r.submitted_at, r.updated_at, r.created_at))
    INTO v_last
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE;

  IF v_last IS NOT NULL AND now() < v_last + interval '48 hours' THEN
    SELECT a.id INTO v_auth
    FROM public.exam_retake_authorizations a
    WHERE a.apprenant_id = NEW.apprenant_id
      AND a.exam_id = v_exam
      AND a.consumed_at IS NULL
      AND a.revoked_at IS NULL
    ORDER BY a.created_at ASC
    LIMIT 1;

    IF v_auth IS NOT NULL THEN
      UPDATE public.exam_retake_authorizations
         SET consumed_at = now()
       WHERE id = v_auth;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'EXAM_RETAKE_DELAY_48H: nouvelle tentative possible le %',
      to_char((v_last + interval '48 hours') AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY HH24"h"MI')
      USING ERRCODE = 'P0471';
  END IF;

  RETURN NEW;
END;
$function$

;
