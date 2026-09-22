-- Correction du journal d'audit de l'outil de copie des passages historiques.
-- Seule difference avec 0058 : l'INSERT dans public.audit_journal utilise les
-- colonnes reelles de la table (operation / auteur / auteur_email / apres / origine).
-- Aucune donnee pedagogique n'est modifiee par cette migration.

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
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
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

  SELECT EXISTS (
    SELECT 1 FROM public.reponses_apprenants ra
    WHERE ra.apprenant_id = src.apprenant_id
      AND ra.exercice_type = 'examen_blanc'
      AND ra.exercice_id = v_exam_id || '__' || src.matiere_id
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

  -- Journal d'audit : colonnes reelles de public.audit_journal.
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