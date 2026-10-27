-- Additive subject-only retake. Existing copies and incident-recovery RPCs are untouched.
CREATE TABLE public.exam_subject_retakes (
  operation_id uuid PRIMARY KEY,
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  matiere_id text NOT NULL,
  source_exercice_id text NOT NULL,
  source_attempt_id uuid,
  attempt_id uuid,
  exercice_id text NOT NULL,
  tentative integer NOT NULL,
  moteur text NOT NULL,
  matiere jsonb NOT NULL,
  authorization_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(apprenant_id, exam_id, matiere_id, source_exercice_id),
  UNIQUE(apprenant_id, exercice_id)
);
GRANT SELECT ON public.exam_subject_retakes TO authenticated;
GRANT ALL ON public.exam_subject_retakes TO service_role;
ALTER TABLE public.exam_subject_retakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY subject_retake_owner_read ON public.exam_subject_retakes FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.start_exam_subject_retake(
  p_operation_id uuid, p_apprenant_id uuid, p_exam_id text, p_matiere_id text,
  p_source_exercice_id text, p_source_attempt_id uuid DEFAULT NULL
) RETURNS public.exam_subject_retakes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  receipt public.exam_subject_retakes;
  old_attempt public.exam_attempts_v2;
  new_attempt public.exam_attempts_v2;
  answer public.reponses_apprenants;
  timer public.apprenant_examen_timers;
  subject jsonb;
  closed_at timestamptz;
  last_closed timestamptz;
  authorization uuid;
  next_number integer;
  new_key text;
  engine text := 'ancien';
  duration_seconds integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.core_est_proprietaire(p_apprenant_id) THEN
    RAISE EXCEPTION 'Session ou droits insuffisants pour refaire cette matière.' USING ERRCODE='42501';
  END IF;
  PERFORM public.core_assert_session_owner(p_apprenant_id);
  IF p_operation_id IS NULL OR p_source_exercice_id IS NULL OR p_matiere_id IS NULL
     OR p_exam_id !~* '^(EB[1-6](-TAXI)?|eb[1-6]-(ta|va))$'
     OR p_source_exercice_id !~ ('^'||p_exam_id||'__'||p_matiere_id||'(__t[0-9]+)?$') THEN
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
      AND source_exercice_id=p_source_exercice_id;
  IF FOUND THEN
    IF receipt.source_attempt_id IS DISTINCT FROM p_source_attempt_id THEN
      RAISE EXCEPTION 'Identité du passage différente.' USING ERRCODE='P0482';
    END IF;
    RETURN receipt;
  END IF;
  SELECT e INTO subject FROM public.module_editor_state m,
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
       OR old_attempt.snapshot->>'matiere' IS DISTINCT FROM p_matiere_id THEN
      RAISE EXCEPTION 'Le passage ne correspond pas à cette matière et à ce compte.' USING ERRCODE='42501';
    END IF;
    -- Exact mapping is required; never infer a V2 identity from a time window.
    IF NOT EXISTS (SELECT 1 FROM public.exam_subject_retakes r WHERE r.attempt_id=p_source_attempt_id AND r.exercice_id=p_source_exercice_id)
       AND coalesce(old_attempt.snapshot->>'tentative', old_attempt.snapshot#>>'{source_historique,tentative}') IS DISTINCT FROM
          greatest(coalesce(answer.tentative,1),coalesce(nullif(substring(p_source_exercice_id FROM '__t([0-9]+)$'),'')::integer,1))::text THEN
      RAISE EXCEPTION 'Correspondance copie/passage non prouvée ; contactez l’administration.' USING ERRCODE='P0482';
    END IF;
    IF old_attempt.etat='terminee' THEN closed_at:=coalesce(old_attempt.finished_at,closed_at); END IF;
    -- Refuse a changed subject, rather than borrowing current questions for an old snapshot.
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(subject->'questions') q WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(old_attempt.snapshot->'questions') s
      WHERE s->>'id'=p_matiere_id||':'||(q->>'id') AND s->>'enonce'=q->>'enonce'
        AND s->>'type'=q->>'type' AND coalesce(s->'choix','null'::jsonb)=coalesce(q->'choix','null'::jsonb)))
       OR jsonb_array_length(subject->'questions')<>jsonb_array_length(old_attempt.snapshot->'questions') THEN
      RAISE EXCEPTION 'Sujet différent de la copie conservée ; contactez l’administration.' USING ERRCODE='P0487';
    END IF;
    engine:='v2';
  ELSIF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id
      AND a.snapshot->>'matiere'=p_matiere_id) THEN
    RAISE EXCEPTION 'Identifiant du passage serveur requis ; contactez l’administration.' USING ERRCODE='P0482';
  END IF;
  IF closed_at IS NULL THEN
    RAISE EXCEPTION 'Cette matière est encore en cours ; reprenez sa copie existante.' USING ERRCODE='P0478';
  END IF;
  SELECT greatest(closed_at,
    (SELECT max(coalesce(r.submitted_at,r.updated_at)) FROM public.reponses_apprenants r
      WHERE r.apprenant_id=p_apprenant_id AND r.exercice_type='examen_blanc'
        AND split_part(r.exercice_id,'__',1)=p_exam_id AND r.completed),
    (SELECT max(a.finished_at) FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id AND a.exam_id=p_exam_id AND a.etat='terminee'))
    INTO last_closed;
  IF now()<last_closed+interval '48 hours' THEN
    SELECT id INTO authorization FROM public.exam_retake_authorizations a WHERE a.apprenant_id=p_apprenant_id
      AND a.exam_id=p_exam_id AND a.consumed_at IS NULL AND a.revoked_at IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE;
    IF authorization IS NULL THEN
      RAISE EXCEPTION 'Demandez une autorisation à l’administration, ou attendez 48 heures après la fin du passage (%).',
        to_char((last_closed+interval '48 hours') AT TIME ZONE 'Europe/Paris','DD/MM/YYYY HH24:MI') USING ERRCODE='P0471';
    END IF;
  END IF;
  SELECT greatest(coalesce((SELECT max(greatest(r.tentative,coalesce(nullif(substring(r.exercice_id FROM '__t([0-9]+)$'),'')::integer,1)))
    FROM public.reponses_apprenants r WHERE r.apprenant_id=p_apprenant_id AND split_part(r.exercice_id,'__',1)=p_exam_id),1),
    coalesce((SELECT max(r.tentative) FROM public.exam_subject_retakes r WHERE r.apprenant_id=p_apprenant_id AND r.exam_id=p_exam_id),1),
    coalesce((SELECT max(r.tentative) FROM public.apprenant_quiz_results r WHERE r.apprenant_id=p_apprenant_id AND r.quiz_id=p_exam_id),1))+1 INTO next_number;
  new_key:=p_exam_id||'__'||p_matiere_id||'__t'||next_number;
  -- Fresh empty projection, never UPDATE/DELETE the previous copy. The existing delay trigger remains active.
  INSERT INTO public.reponses_apprenants(apprenant_id,user_id,exercice_id,exercice_type,tentative)
    VALUES(p_apprenant_id,auth.uid(),new_key,'examen_blanc',next_number);
  IF engine='v2' THEN
    INSERT INTO public.exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,etat,is_test)
      VALUES(p_apprenant_id,p_exam_id,old_attempt.exam_version_id,
        (old_attempt.snapshot-'source_historique')||jsonb_build_object('tentative',next_number,'subject_retake_source',p_source_attempt_id),
        md5(((old_attempt.snapshot-'source_historique')||jsonb_build_object('tentative',next_number,'subject_retake_source',p_source_attempt_id))::text),
        'en_cours',old_attempt.is_test) RETURNING * INTO new_attempt;
  END IF;
  INSERT INTO public.apprenant_examen_timers(apprenant_id,user_id,exercice_id,duree_secondes,tentative)
    VALUES(p_apprenant_id,auth.uid(),new_key,duration_seconds,next_number);
  IF authorization IS NOT NULL THEN
    UPDATE public.exam_retake_authorizations SET consumed_at=now() WHERE id=authorization AND consumed_at IS NULL;
  END IF;
  INSERT INTO public.exam_subject_retakes(operation_id,apprenant_id,exam_id,matiere_id,source_exercice_id,source_attempt_id,
      attempt_id,exercice_id,tentative,moteur,matiere,authorization_id)
    VALUES(p_operation_id,p_apprenant_id,p_exam_id,p_matiere_id,p_source_exercice_id,p_source_attempt_id,
      new_attempt.attempt_id,new_key,next_number,engine,subject,authorization) RETURNING * INTO receipt;
  RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.start_exam_subject_retake(uuid,uuid,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam_subject_retake(uuid,uuid,text,text,text,uuid) TO authenticated;