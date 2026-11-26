-- CANDIDAT NON APPLIQUE. Definitions exactes SELECT du 26/11, gardes/ACL seulement.
CREATE OR REPLACE FUNCTION public.core_finalize_attempt(p_operation_id uuid, p_attempt_id uuid, p_qrc_questions text[] DEFAULT '{}'::text[], p_resultat jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rejeu jsonb;
  att public.exam_attempts_v2%ROWTYPE;
  qid text;
  nb_qrc integer := 0;
  nb_vides integer := 0;
  resultat jsonb;
  v_elearning boolean;
  v_valeur jsonb;
  v_trace boolean;
  v_inst uuid;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', p_attempt_id USING ERRCODE = 'P0477';
  END IF;

  IF NOT coalesce((auth.role() = 'service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') AND current_setting('role',true) IN ('none','postgres'))) OR (auth.uid() IS NOT NULL AND coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)) OR (auth.uid() IS NOT NULL AND public.core_est_proprietaire(att.apprenant_id)),false) THEN
    RAISE EXCEPTION 'TENTATIVE_NON_AUTORISEE' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.core_operations WHERE operation_id=p_operation_id AND attempt_id IS DISTINCT FROM p_attempt_id) THEN
    RAISE EXCEPTION 'OPERATION_AUTRE_TENTATIVE' USING ERRCODE='42501';
  END IF;
  rejeu := public.core_operation_replay(p_operation_id, 'attempt_finalize');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  IF att.etat <> 'en_cours' THEN
    RAISE EXCEPTION 'ATTEMPT_CLOSED: la tentative % est deja %.', p_attempt_id, att.etat USING ERRCODE = 'P0478';
  END IF;

  SELECT public.core_est_elearning(a.type_apprenant) INTO v_elearning
  FROM public.apprenants a WHERE a.id = att.apprenant_id;
  v_elearning := coalesce(v_elearning, false)
    AND NOT EXISTS (SELECT 1 FROM public.core_tentatives_neutralisees n WHERE n.attempt_id = p_attempt_id);

  FOREACH qid IN ARRAY coalesce(p_qrc_questions, '{}'::text[]) LOOP
    IF NOT public.core_snapshot_has_question(att.snapshot, qid) THEN
      RAISE EXCEPTION 'QUESTION_HORS_SNAPSHOT: la question % ne fait pas partie du snapshot de la tentative % (examen %).',
        qid, att.attempt_id, att.exam_id
        USING ERRCODE = 'P0479';
    END IF;

    v_valeur := (SELECT valeur FROM public.answer_state WHERE attempt_id = p_attempt_id AND question_id = qid);
    v_inst := NULL;

    INSERT INTO public.qrc_instances_v2 (attempt_id, question_id, apprenant_id, reponse, etat)
    VALUES (p_attempt_id, qid, att.apprenant_id, v_valeur, 'en_attente')
    ON CONFLICT (attempt_id, question_id) DO NOTHING
    RETURNING qrc_instance_id INTO v_inst;
    nb_qrc := nb_qrc + 1;

    -- 0 automatique : e-learning, instance créée maintenant, réponse vide, et
    -- aucune trace d'une réponse non vide dans l'historique (réponse perdue => pas de 0).
    IF v_elearning AND v_inst IS NOT NULL AND public.core_reponse_qrc_vide(v_valeur) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.answer_events e
        WHERE e.attempt_id = p_attempt_id AND e.question_id = qid
          AND (NOT public.core_reponse_qrc_vide(e.valeur_nouvelle) OR NOT public.core_reponse_qrc_vide(e.valeur_precedente))
      ) INTO v_trace;
      IF NOT v_trace THEN
        PERFORM set_config('core.qrc_commentaire', 'QRC laissée sans réponse', true);
        PERFORM set_config('core.qrc_operation_id', p_operation_id::text, true);
        UPDATE public.qrc_instances_v2
        SET etat = 'corrigee', note = 0, corrige_par = NULL, corrige_email = 'auto:qrc_sans_reponse', corrige_at = now()
        WHERE qrc_instance_id = v_inst AND etat = 'en_attente';
        PERFORM set_config('core.qrc_commentaire', '', true);
        PERFORM set_config('core.qrc_operation_id', '', true);
        nb_vides := nb_vides + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.exam_attempts_v2
  SET etat = 'terminee', finished_at = now()
  WHERE attempt_id = p_attempt_id;

  resultat := jsonb_build_object('attempt_id', p_attempt_id, 'etat', 'terminee', 'qrc_creees', nb_qrc,
                                 'qrc_sans_reponse_zero', nb_vides, 'resultat', p_resultat);

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'attempt_finalize', att.apprenant_id, p_attempt_id, auth.uid(),
          jsonb_build_object('qrc_questions', to_jsonb(p_qrc_questions)), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('attempt_finalize', 'exam_attempts_v2', p_attempt_id::text, att.exam_id, att.exam_version_id, p_attempt_id, att.apprenant_id, auth.uid(), resultat, 'core_finalize_attempt');

  RETURN resultat;
END;
$function$;

CREATE OR REPLACE FUNCTION public.core_import_passage_finalise(p_result_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  src           public.apprenant_quiz_results%ROWTYPE;
  v_exam_id     text;
  v_version_id  uuid;
  v_attempt_id  uuid;
  v_deja        uuid;
  v_finalise    boolean;
  v_questions   jsonb;
  v_snapshot    jsonb;
  v_lettre      text;
  v_nb_rep      integer := 0;
  v_nb_qrc      integer := 0;
  q             jsonb;
  v_val         jsonb;
BEGIN
  IF NOT coalesce((auth.role() = 'service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') AND current_setting('role',true) IN ('none','postgres'))) OR (auth.uid() IS NOT NULL AND coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)),false) THEN
    RAISE EXCEPTION 'IMPORT_NON_AUTORISE: seul un administrateur peut importer un passage finalise.'
      USING ERRCODE = 'P0484';
  END IF;

  SELECT * INTO src FROM public.apprenant_quiz_results WHERE id = p_result_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('statut','ignore','motif','SOURCE_INTROUVABLE','result_id',p_result_id);
  END IF;

  IF src.quiz_type <> 'examen_blanc' THEN
    RETURN jsonb_build_object('statut','ignore','motif','PAS_UN_EXAMEN_BLANC','result_id',p_result_id);
  END IF;

  SELECT attempt_id INTO v_deja
  FROM public.exam_attempts_v2
  WHERE snapshot->'source_historique'->>'result_id' = p_result_id::text;
  IF v_deja IS NOT NULL THEN
    RETURN jsonb_build_object('statut','deja_importe','attempt_id',v_deja,'result_id',p_result_id);
  END IF;

  IF NOT (src.details ? 'snapshot') OR NOT (src.details ? 'reponses')
     OR jsonb_typeof(src.details->'snapshot'->'questions') <> 'array'
     OR jsonb_array_length(src.details->'snapshot'->'questions') = 0 THEN
    RETURN jsonb_build_object('statut','ignore','motif','SANS_CONTENU_HISTORIQUE','result_id',p_result_id);
  END IF;

  v_exam_id := src.quiz_id;

  -- 27/10 : la preuve de remise doit appartenir à LA MÊME tentative (suffixe __tN).
  SELECT EXISTS (
    SELECT 1 FROM public.reponses_apprenants ra
    WHERE ra.apprenant_id = src.apprenant_id
      AND ra.exercice_type = 'examen_blanc'
      AND ra.exercice_id = v_exam_id || '__' || src.matiere_id
                        || CASE WHEN coalesce(src.tentative,1) > 1 THEN '__t' || src.tentative ELSE '' END
      AND ra.status = 'submitted'
      AND ra.completed IS TRUE
  ) INTO v_finalise;

  IF NOT v_finalise THEN
    RETURN jsonb_build_object('statut','ignore','motif','MATIERE_NON_FINALISEE','result_id',p_result_id);
  END IF;

  SELECT id INTO v_version_id
  FROM public.exam_content_versions
  WHERE exam_id = v_exam_id AND motif LIKE 'IMPORT HISTORIQUE%'
  ORDER BY created_at LIMIT 1;

  IF v_version_id IS NULL THEN
    INSERT INTO public.exam_content_versions (exam_id, filiere, exam_numero, version_number, statut, content, fingerprint, motif)
    VALUES (v_exam_id, NULL, public.exam_numero_from_id(v_exam_id), 1, 'brouillon', '{}'::jsonb, '',
            'IMPORT HISTORIQUE — rattachement des passages copies depuis l''ancien systeme. Aucun contenu publie : le contenu reel de chaque passage vit dans le snapshot de sa tentative.')
    RETURNING id INTO v_version_id;
  END IF;

  v_lettre := NULLIF(split_part(COALESCE(src.matiere_nom,''), ' - ', 1), '');

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',         (x->>'id'),
      'type',       (x->>'type'),
      'choix',      CASE WHEN jsonb_typeof(x->'choix') = 'array' THEN x->'choix' ELSE 'null'::jsonb END,
      'image',      COALESCE(x->'image','null'::jsonb),
      'ordre',      COALESCE(x->'ordre','null'::jsonb),
      'enonce',     (x->>'enonce'),
      'points',     COALESCE(x->'points','null'::jsonb),
      'matiere',    src.matiere_id,
      'reponseQRC', COALESCE(x->'reponseQRC','null'::jsonb)
    ) ORDER BY ord
  ) INTO v_questions
  FROM jsonb_array_elements(src.details->'snapshot'->'questions') WITH ORDINALITY AS t(x, ord);

  v_snapshot := jsonb_build_object(
    'exam_id',     v_exam_id,
    'exam_libelle', v_exam_id,
    'matieres',    jsonb_build_array(jsonb_build_object(
                     'subject_id', src.matiere_id,
                     'lettre',     COALESCE(v_lettre, src.matiere_id),
                     'titre',      src.matiere_nom,
                     'ordre',      1)),
    'questions',   v_questions,
    'session',     jsonb_build_object(
                     'date',  to_char(src.completed_at AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY'),
                     'heure', to_char(src.completed_at AT TIME ZONE 'Europe/Paris', 'HH24:MI')),
    'source_historique', jsonb_build_object(
                     'origine',      'import-historique',
                     'result_id',    p_result_id,
                     'tentative',    src.tentative,
                     'completed_at', src.completed_at,
                     'details',      src.details)
  );

  INSERT INTO public.exam_attempts_v2 (apprenant_id, exam_id, exam_version_id, snapshot, snapshot_fingerprint, started_at, etat, is_test)
  VALUES (src.apprenant_id, v_exam_id, v_version_id, v_snapshot, md5(v_snapshot::text), src.completed_at, 'en_cours', false)
  RETURNING attempt_id INTO v_attempt_id;

  FOR q IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
    IF NOT (src.details->'reponses' ? (q->>'id')) THEN
      CONTINUE;
    END IF;
    v_val := src.details->'reponses'->(q->>'id');

    INSERT INTO public.answer_state (attempt_id, apprenant_id, question_id, valeur, revision, session_origine)
    VALUES (v_attempt_id, src.apprenant_id, q->>'id', v_val, 1, 'import-historique');
    v_nb_rep := v_nb_rep + 1;

    IF upper(COALESCE(q->>'type','')) = 'QRC' THEN
      INSERT INTO public.qrc_instances_v2 (attempt_id, apprenant_id, question_id, reponse, etat)
      VALUES (v_attempt_id, src.apprenant_id, q->>'id', v_val, 'en_attente');
      v_nb_qrc := v_nb_qrc + 1;
    END IF;
  END LOOP;

  UPDATE public.exam_attempts_v2
     SET etat = 'terminee', finished_at = src.completed_at
   WHERE attempt_id = v_attempt_id;

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('IMPORT_PASSAGE_FINALISE', 'exam_attempt_v2', v_attempt_id::text, v_exam_id, v_version_id, v_attempt_id, src.apprenant_id, auth.uid(),
          jsonb_build_object('result_id', p_result_id, 'exam_id', v_exam_id, 'matiere_id', src.matiere_id,
                             'tentative', src.tentative, 'reponses', v_nb_rep, 'qrc', v_nb_qrc),
          'import-historique');

  RETURN jsonb_build_object('statut','importe','attempt_id',v_attempt_id,'result_id',p_result_id,
                            'exam_id',v_exam_id,'matiere_id',src.matiere_id,
                            'reponses',v_nb_rep,'qrc',v_nb_qrc);
END;
$function$;

CREATE OR REPLACE FUNCTION public.core_import_passages_finalises(p_exam_prefix text DEFAULT 'eb3'::text, p_limit integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r          record;
  res        jsonb;
  importes   integer := 0;
  deja       integer := 0;
  ignores    integer := 0;
  detail     jsonb := '[]'::jsonb;
BEGIN
  IF NOT coalesce((auth.role() = 'service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') AND current_setting('role',true) IN ('none','postgres'))) OR (auth.uid() IS NOT NULL AND coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)),false) THEN
    RAISE EXCEPTION 'IMPORT_NON_AUTORISE: seul un administrateur peut lancer la copie des passages finalises.'
      USING ERRCODE = 'P0484';
  END IF;

  FOR r IN
    SELECT qr.id
    FROM public.apprenant_quiz_results qr
    WHERE qr.quiz_type = 'examen_blanc'
      AND qr.quiz_id ILIKE p_exam_prefix || '%'
      AND qr.details ? 'snapshot'
      AND qr.details ? 'reponses'
      AND NOT EXISTS (
        SELECT 1 FROM public.exam_attempts_v2 a
        WHERE a.snapshot->'source_historique'->>'result_id' = qr.id::text
      )
    ORDER BY qr.completed_at
    LIMIT p_limit
  LOOP
    res := public.core_import_passage_finalise(r.id);
    IF res->>'statut' = 'importe' THEN
      importes := importes + 1;
      detail := detail || jsonb_build_array(res);
    ELSIF res->>'statut' = 'deja_importe' THEN
      deja := deja + 1;
    ELSE
      ignores := ignores + 1;
      detail := detail || jsonb_build_array(res);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('prefixe', p_exam_prefix, 'importes', importes, 'deja_importes', deja,
                            'ignores', ignores, 'detail', detail);
END;
$function$;

CREATE OR REPLACE FUNCTION public.core_operation_replay(p_operation_id uuid, p_operation_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existante public.core_operations%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'OPERATION_ID_OBLIGATOIRE: toute ecriture doit porter un operation_id unique.'
      USING ERRCODE = 'P0482';
  END IF;

  SELECT * INTO existante FROM public.core_operations WHERE operation_id = p_operation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT coalesce((auth.role() = 'service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') AND current_setting('role',true) IN ('none','postgres'))) OR (auth.uid() IS NOT NULL AND coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)) OR (auth.uid() IS NOT NULL AND (existante.auteur = auth.uid() OR public.core_est_proprietaire(existante.apprenant_id))),false) THEN
    RAISE EXCEPTION 'OPERATION_NON_AUTORISEE' USING ERRCODE='42501';
  END IF;

  IF existante.operation_type <> p_operation_type THEN
    RAISE EXCEPTION 'OPERATION_ID_REUTILISE: operation_id % deja utilise pour une operation de type %.',
      p_operation_id, existante.operation_type
      USING ERRCODE = 'P0482';
  END IF;

  RETURN jsonb_build_object('rejeu', true, 'resultat', existante.resultat);
END;
$function$;

CREATE OR REPLACE FUNCTION public.core_publish_exam_version(p_operation_id uuid, p_version_id uuid, p_published_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rejeu jsonb;
  v public.exam_content_versions%ROWTYPE;
  ancienne uuid;
  resultat jsonb;
BEGIN
  IF NOT coalesce((auth.role() = 'service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') AND current_setting('role',true) IN ('none','postgres'))),false) THEN RAISE EXCEPTION 'SERVICE_REQUIS' USING ERRCODE='42501'; END IF;
  rejeu := public.core_operation_replay(p_operation_id, 'exam_publish');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO v FROM public.exam_content_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_INTROUVABLE: version % inexistante.', p_version_id USING ERRCODE = 'P0472';
  END IF;

  -- serialise les publications concurrentes du meme examen
  PERFORM pg_advisory_xact_lock(hashtext('exam_publish:' || v.exam_id));

  SELECT * INTO v FROM public.exam_content_versions WHERE id = p_version_id FOR UPDATE;

  IF v.statut <> 'brouillon' THEN
    RAISE EXCEPTION 'PUBLICATION_INVALIDE: seule une version brouillon peut etre publiee (version % = %).', p_version_id, v.statut
      USING ERRCODE = 'P0472';
  END IF;

  SELECT id INTO ancienne
  FROM public.exam_content_versions
  WHERE exam_id = v.exam_id AND statut = 'publiee' AND retired_at IS NULL
  FOR UPDATE;

  IF ancienne IS NOT NULL THEN
    UPDATE public.exam_content_versions
    SET statut = 'retiree', retired_at = now()
    WHERE id = ancienne;
  END IF;

  UPDATE public.exam_content_versions
  SET statut = 'publiee', published_at = now(), published_by = auth.uid(), published_email = p_published_email
  WHERE id = p_version_id
  RETURNING * INTO v;

  resultat := jsonb_build_object(
    'exam_id', v.exam_id,
    'version_id', v.id,
    'version_number', v.version_number,
    'fingerprint', v.fingerprint,
    'version_retiree', ancienne
  );

  INSERT INTO public.core_operations (operation_id, operation_type, auteur, cible, resultat)
  VALUES (p_operation_id, 'exam_publish', auth.uid(), jsonb_build_object('version_id', p_version_id), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('exam_publish', 'exam_content_versions', p_version_id::text, v.exam_id, v.id, auth.uid(), p_published_email,
          jsonb_build_object('version_active_precedente', ancienne), resultat, 'core_publish_exam_version');

  RETURN resultat;
END;
$function$;

CREATE OR REPLACE FUNCTION public.core_purge_donnees_test()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ids uuid[];
  n_att int := 0; n_rep int := 0; n_evt int := 0; n_qrc int := 0; n_cor int := 0; n_res int := 0; n_ver int := 0;
BEGIN
  IF NOT coalesce((auth.role() = 'service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') AND current_setting('role',true) IN ('none','postgres'))),false) THEN RAISE EXCEPTION 'SERVICE_REQUIS' USING ERRCODE='42501'; END IF;
  SELECT coalesce(array_agg(attempt_id), '{}') INTO ids FROM public.exam_attempts_v2 WHERE is_test;

  ALTER TABLE public.answer_events DISABLE TRIGGER USER;
  ALTER TABLE public.answer_state DISABLE TRIGGER USER;
  ALTER TABLE public.qrc_instances_v2 DISABLE TRIGGER USER;
  ALTER TABLE public.qrc_correction_events DISABLE TRIGGER USER;
  ALTER TABLE public.exam_attempts_v2 DISABLE TRIGGER USER;
  ALTER TABLE public.exam_content_versions DISABLE TRIGGER USER;
  ALTER TABLE public.core_operations DISABLE TRIGGER USER;
  ALTER TABLE public.audit_journal DISABLE TRIGGER USER;

  DELETE FROM public.core_exam_results WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_res = ROW_COUNT;
  DELETE FROM public.qrc_correction_events WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_cor = ROW_COUNT;
  DELETE FROM public.qrc_instances_v2 WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_qrc = ROW_COUNT;
  DELETE FROM public.answer_events WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_evt = ROW_COUNT;
  DELETE FROM public.answer_state WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_rep = ROW_COUNT;
  DELETE FROM public.core_operations WHERE attempt_id = ANY(ids);
  DELETE FROM public.audit_journal WHERE attempt_id = ANY(ids);
  DELETE FROM public.exam_attempts_v2 WHERE is_test;
  GET DIAGNOSTICS n_att = ROW_COUNT;
  DELETE FROM public.exam_content_versions WHERE is_test;
  GET DIAGNOSTICS n_ver = ROW_COUNT;

  ALTER TABLE public.answer_events ENABLE TRIGGER USER;
  ALTER TABLE public.answer_state ENABLE TRIGGER USER;
  ALTER TABLE public.qrc_instances_v2 ENABLE TRIGGER USER;
  ALTER TABLE public.qrc_correction_events ENABLE TRIGGER USER;
  ALTER TABLE public.exam_attempts_v2 ENABLE TRIGGER USER;
  ALTER TABLE public.exam_content_versions ENABLE TRIGGER USER;
  ALTER TABLE public.core_operations ENABLE TRIGGER USER;
  ALTER TABLE public.audit_journal ENABLE TRIGGER USER;

  RETURN jsonb_build_object('tentatives', n_att, 'reponses', n_rep, 'evenements', n_evt,
                            'qrc', n_qrc, 'corrections', n_cor, 'resultats', n_res, 'versions', n_ver);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.core_publish_exam_version(uuid,uuid,text), public.core_operation_replay(uuid,text), public.core_purge_donnees_test() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.core_operation_replay(uuid,text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.core_publish_exam_version(uuid,uuid,text), public.core_purge_donnees_test() TO service_role;
REVOKE EXECUTE ON FUNCTION public.core_finalize_attempt(uuid,uuid,text[],jsonb), public.core_import_passage_finalise(uuid), public.core_import_passages_finalises(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.core_finalize_attempt(uuid,uuid,text[],jsonb), public.core_import_passage_finalise(uuid), public.core_import_passages_finalises(text,integer) TO authenticated,service_role;
