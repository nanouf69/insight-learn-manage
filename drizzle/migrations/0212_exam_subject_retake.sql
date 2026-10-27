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
CREATE FUNCTION public.exam_subject_retake_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  RAISE EXCEPTION 'Reçu de reprise immuable ; modification ou suppression interdite.' USING ERRCODE='P0482';
END $$;
CREATE TRIGGER subject_retake_immutable BEFORE UPDATE OR DELETE ON public.exam_subject_retakes
FOR EACH ROW EXECUTE FUNCTION public.exam_subject_retake_immutable();

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
  v_authorization uuid;
  next_number integer;
  new_key text;
  engine text := 'ancien';
  duration_seconds integer;
  source_number integer;
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
      AND source_exercice_id=p_source_exercice_id;
  IF FOUND THEN
    IF receipt.source_attempt_id IS DISTINCT FROM p_source_attempt_id THEN
      RAISE EXCEPTION 'Identité du passage différente.' USING ERRCODE='P0482';
    END IF;
    RETURN receipt;
  END IF;
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
    source_number := coalesce(nullif(substring(p_source_exercice_id FROM '__t([0-9]+)$'),'')::integer,1);
    -- Exact proof only, never a time window: (a) receipt of an earlier retake, (b) imported copy whose
    -- result_id is this learner/subject/tentative, (c) sole native copy of a first passage.
    IF NOT (
      EXISTS (SELECT 1 FROM public.exam_subject_retakes r
         WHERE r.apprenant_id=p_apprenant_id AND r.attempt_id=p_source_attempt_id AND r.exercice_id=p_source_exercice_id)
      OR EXISTS (SELECT 1 FROM public.apprenant_quiz_results q
         WHERE (old_attempt.snapshot->'source_historique'->>'result_id') ~* '^[0-9a-f-]{36}$'
           AND q.id=(old_attempt.snapshot->'source_historique'->>'result_id')::uuid
           AND q.apprenant_id=p_apprenant_id AND q.quiz_id=p_exam_id AND q.matiere_id=p_matiere_id
           AND q.tentative=source_number)
      OR (source_number=1 AND old_attempt.snapshot->>'matiere'=p_matiere_id
          AND NOT old_attempt.snapshot ? 'source_historique' AND NOT old_attempt.snapshot ? 'subject_retake_source'
          AND (SELECT count(*) FROM public.exam_attempts_v2 a WHERE a.apprenant_id=p_apprenant_id
                AND a.exam_id=p_exam_id AND a.snapshot->>'matiere'=p_matiere_id)=1)
    ) THEN
      RAISE EXCEPTION 'Correspondance copie/passage non prouvée ; contactez l’administration.' USING ERRCODE='P0482';
    END IF;
    IF old_attempt.etat IS DISTINCT FROM 'terminee' OR old_attempt.finished_at IS NULL THEN
      RAISE EXCEPTION 'Clôture du passage serveur non prouvée ; reprenez la copie existante.' USING ERRCODE='P0478';
    END IF;
    closed_at:=old_attempt.finished_at;
    -- Refuse a changed subject, rather than borrowing current questions for an old snapshot.
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(subject->'questions') q WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(old_attempt.snapshot->'questions') s
      WHERE s->>'id'=p_matiere_id||':'||(q->>'id') AND s->>'enonce'=q->>'enonce'
        AND s->>'type'=q->>'type' AND coalesce(s->'choix','null'::jsonb)=coalesce(q->'choix','null'::jsonb)
        AND coalesce(s->'reponseQRC','null'::jsonb)=coalesce(q->'reponseQRC','null'::jsonb)
        AND coalesce(s->'bareme','null'::jsonb)=coalesce(q->'bareme','null'::jsonb)))
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
  IF now()<last_closed+interval '48 hours' THEN
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
  IF v_authorization IS NOT NULL THEN
    UPDATE public.exam_retake_authorizations SET consumed_at=now() WHERE id=v_authorization AND consumed_at IS NULL;
  END IF;
  INSERT INTO public.exam_subject_retakes(operation_id,apprenant_id,exam_id,matiere_id,source_exercice_id,source_attempt_id,
      attempt_id,exercice_id,tentative,moteur,matiere,authorization_id)
    VALUES(p_operation_id,p_apprenant_id,p_exam_id,p_matiere_id,p_source_exercice_id,p_source_attempt_id,
      new_attempt.attempt_id,new_key,next_number,engine,subject,v_authorization) RETURNING * INTO receipt;
  RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.start_exam_subject_retake(uuid,uuid,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam_subject_retake(uuid,uuid,text,text,text,uuid) TO authenticated;

-- Completion isolation for receipts only (legacy branch byte-identical below the inserted block).
CREATE OR REPLACE FUNCTION public.ensure_quiz_result_on_matiere_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz_id text;
  v_matiere_raw text;
  v_matiere text;
  v_tentative integer := 1;
  v_exists boolean;
  v_apprenant_exists boolean;
  m text[];
  t text[];
  v_retake_tentative integer;
BEGIN
  IF NEW.exercice_type IS DISTINCT FROM 'examen_blanc' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.completed, false) <> true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.completed, false) = true THEN
    RETURN NEW;
  END IF;

  m := regexp_match(NEW.exercice_id, '^((?:EB|eb)\d+(?:-[a-zA-Z0-9]+)?|bilan-[^_]+)_+(.+)$');
  IF m IS NULL THEN
    INSERT INTO public.alertes_systeme (type, titre, message, details)
    VALUES (
      'exam_result_missing',
      'Format exercice_id inconnu (examen blanc)',
      'Impossible de rattacher la matière terminée pour exercice_id=' || NEW.exercice_id,
      jsonb_build_object(
        'apprenant_id', NEW.apprenant_id,
        'exercice_id', NEW.exercice_id,
        'user_id', NEW.user_id
      )::text
    );
    RETURN NEW;
  END IF;

  v_quiz_id := m[1];
  v_matiere_raw := m[2];

  t := regexp_match(v_matiere_raw, '^(.+?)_+t(\d+)$');
  IF t IS NOT NULL THEN
    v_matiere := t[1];
    v_tentative := GREATEST(1, t[2]::integer);
  ELSE
    v_matiere := v_matiere_raw;
    v_tentative := 1;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.apprenants WHERE id = NEW.apprenant_id) INTO v_apprenant_exists;
  IF NOT v_apprenant_exists THEN
    RETURN NEW;
  END IF;

  -- Additive: an explicit subject-retake receipt binds this copy to ONE exact tentative.
  -- Earlier tentatives are never touched; legacy copies without receipt keep the code below.
  SELECT r.tentative INTO v_retake_tentative FROM public.exam_subject_retakes r
   WHERE r.apprenant_id = NEW.apprenant_id AND r.exercice_id = NEW.exercice_id;
  IF FOUND THEN
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_retake_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = v_retake_tentative;
    IF NOT FOUND THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details)
      VALUES ('exam_result_missing',
        'Matière refaite terminée sans note enregistrée (finalisation en attente)',
        'Les réponses sont conservées pour ' || NEW.exercice_id || ' : aucune autre tentative n''a été modifiée.',
        jsonb_build_object('apprenant_id', NEW.apprenant_id, 'quiz_id', v_quiz_id, 'matiere_id', v_matiere,
          'tentative', v_retake_tentative, 'exercice_id', NEW.exercice_id)::text);
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.apprenant_quiz_results
    WHERE apprenant_id = NEW.apprenant_id
      AND quiz_id = v_quiz_id
      AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
  ) INTO v_exists;

  IF v_exists THEN
    -- Une note existe déjà : on ne touche ni au score, ni aux corrections.
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = (
         SELECT MAX(tentative) FROM public.apprenant_quiz_results
         WHERE apprenant_id = NEW.apprenant_id
           AND quiz_id = v_quiz_id
           AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       );
    RETURN NEW;
  END IF;

  -- Aucune note écrite : on signale, on ne crée AUCUN résultat à 0.
  INSERT INTO public.alertes_systeme (type, titre, message, details)
  VALUES (
    'exam_result_missing',
    'Matière terminée sans note enregistrée (finalisation en attente)',
    'Les réponses sont conservées pour ' || NEW.exercice_id || ' : la note doit être recalculée, aucun 0 n''a été enregistré.',
    jsonb_build_object(
      'apprenant_id', NEW.apprenant_id,
      'user_id', NEW.user_id,
      'quiz_id', v_quiz_id,
      'matiere_id', v_matiere,
      'tentative', v_tentative,
      'exercice_id', NEW.exercice_id,
      'raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
    )::text
  );

  RETURN NEW;
END;
$function$;