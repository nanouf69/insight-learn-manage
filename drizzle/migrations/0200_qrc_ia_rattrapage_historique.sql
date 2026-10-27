CREATE TABLE IF NOT EXISTS public.qrc_ia_rattrapages_historiques (
  attempt_id uuid PRIMARY KEY,
  result_id uuid NOT NULL UNIQUE,
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  matiere_id text NOT NULL,
  tentative integer,
  motif text NOT NULL,
  autorise_par uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qrc_ia_rattrapages_historiques TO authenticated;
GRANT ALL ON public.qrc_ia_rattrapages_historiques TO service_role;
ALTER TABLE public.qrc_ia_rattrapages_historiques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin lit rattrapages historiques" ON public.qrc_ia_rattrapages_historiques;
CREATE POLICY "Admin lit rattrapages historiques" ON public.qrc_ia_rattrapages_historiques
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.qrc_ia_rattrapages_historiques_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Journal append-only' USING ERRCODE='42501'; END $$;
DROP TRIGGER IF EXISTS trg_qrc_ia_rattrapages_historiques_append_only ON public.qrc_ia_rattrapages_historiques;
CREATE TRIGGER trg_qrc_ia_rattrapages_historiques_append_only BEFORE UPDATE OR DELETE ON public.qrc_ia_rattrapages_historiques
  FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_rattrapages_historiques_append_only();

CREATE OR REPLACE FUNCTION public.qrc_ia_rattrapage_historique(p_result_id uuid, p_motif text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE src public.apprenant_quiz_results%ROWTYPE; imp jsonb; v_att uuid; v_file text; v_ins uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé administrateur' USING ERRCODE='42501';
  END IF;
  IF coalesce(length(trim(p_motif)),0) < 5 THEN RAISE EXCEPTION 'Motif obligatoire' USING ERRCODE='22023'; END IF;
  SELECT * INTO src FROM public.apprenant_quiz_results WHERE id = p_result_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('statut','ignore','motif','SOURCE_INTROUVABLE'); END IF;
  IF EXISTS (SELECT 1 FROM public.apprenant_quiz_results o
             WHERE o.apprenant_id=src.apprenant_id AND o.quiz_type='examen_blanc' AND o.quiz_id=src.quiz_id
               AND split_part(o.matiere_id,'__',1)=split_part(src.matiere_id,'__',1) AND o.id<>src.id
               AND (coalesce(o.tentative,1) > coalesce(src.tentative,1)
                    OR (coalesce(o.tentative,1) = coalesce(src.tentative,1) AND o.completed_at > src.completed_at))) THEN
    RETURN jsonb_build_object('statut','ignore','motif','PAS_LA_COPIE_AFFICHEE','result_id',p_result_id);
  END IF;
  imp := public.core_import_passage_finalise(p_result_id);
  IF imp->>'statut' NOT IN ('importe','deja_importe') THEN RETURN imp; END IF;
  v_att := (imp->>'attempt_id')::uuid;
  INSERT INTO public.qrc_ia_rattrapages_historiques(attempt_id,result_id,apprenant_id,exam_id,matiere_id,tentative,motif,autorise_par)
  VALUES (v_att,p_result_id,src.apprenant_id,src.quiz_id,src.matiere_id,src.tentative,left(p_motif,300),auth.uid())
  ON CONFLICT DO NOTHING RETURNING attempt_id INTO v_ins;
  IF v_ins IS NOT NULL THEN
    INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, attempt_id, apprenant_id, auteur, apres, origine)
    VALUES ('RATTRAPAGE_IA_HISTORIQUE','exam_attempt_v2',v_att::text,src.quiz_id,v_att,src.apprenant_id,auth.uid(),
            jsonb_build_object('result_id',p_result_id,'matiere_id',src.matiere_id,'tentative',src.tentative,'motif',left(p_motif,300)),'rattrapage-historique');
  END IF;
  v_file := public.qrc_ia_enfiler(v_att, 'rattrapage_historique');
  RETURN imp || jsonb_build_object('file', v_file, 'autorisation', CASE WHEN v_ins IS NULL THEN 'existante' ELSE 'creee' END);
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_rattrapage_historique(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_rattrapage_historique(uuid,text) TO authenticated, service_role;

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

CREATE OR REPLACE FUNCTION public.examens_blancs_controle(_apprenant_id uuid, _module_id integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ex AS (
    SELECT exam_id FROM public.examens_blancs_parcours WHERE module_id = _module_id
  ),
  req AS (
    SELECT q.quiz_id, count(DISTINCT split_part(q.matiere_id, '__', 1)) AS rq
      FROM public.apprenant_quiz_results q
     WHERE q.quiz_type = 'examen_blanc' AND q.quiz_id IN (SELECT exam_id FROM ex)
     GROUP BY q.quiz_id
  ),
  per AS (
    SELECT ex.exam_id,
      EXISTS (SELECT 1 FROM public.exam_attempts_v2 a
               WHERE a.apprenant_id = _apprenant_id AND a.exam_id = ex.exam_id
                 AND a.etat = 'terminee' AND NOT coalesce(a.is_test, false)
                 AND coalesce(a.snapshot->'source_historique'->>'origine','') <> 'import-historique') AS v2,
      (SELECT count(DISTINCT split_part(q.matiere_id, '__', 1)) FROM public.apprenant_quiz_results q
        WHERE q.apprenant_id = _apprenant_id AND q.quiz_type = 'examen_blanc' AND q.quiz_id = ex.exam_id) AS nm,
      coalesce((SELECT rq FROM req WHERE req.quiz_id = ex.exam_id), 0) AS rq
    FROM ex
  )
  SELECT jsonb_build_object(
    'module_id', _module_id,
    'total', (SELECT count(*) FROM per),
    'termines', (SELECT count(*) FROM per WHERE v2 OR (rq > 0 AND nm >= rq)),
    'complet', (SELECT count(*) FROM per) = 6
               AND (SELECT count(*) FROM per WHERE v2 OR (rq > 0 AND nm >= rq)) = 6,
    'detail', (SELECT jsonb_agg(jsonb_build_object('exam', exam_id, 'v2', v2, 'matieres', nm, 'requises', rq) ORDER BY exam_id) FROM per)
  );
$function$;

CREATE OR REPLACE FUNCTION public.qrc_ia_raison_file(p_attempt uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c record; a record; ap record;
BEGIN
 SELECT * INTO c FROM public.qrc_ia_config WHERE id;
 IF NOT FOUND OR NOT c.actif OR c.actif_depuis IS NULL THEN RETURN 'ia_desactivee'; END IF;
 SELECT attempt_id, apprenant_id, etat, finished_at, is_test INTO a FROM public.exam_attempts_v2 WHERE attempt_id=p_attempt;
 IF NOT FOUND THEN RETURN 'passage_introuvable'; END IF;
 IF a.etat<>'terminee' OR a.finished_at IS NULL THEN RETURN 'passage_non_termine'; END IF;
 IF a.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN 'exclu'; END IF;
 IF a.is_test OR EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id) THEN RETURN 'compte_test'; END IF;
 IF a.finished_at < greatest(c.actif_depuis, timestamptz '2026-10-20 09:53+00')
    AND NOT EXISTS (SELECT 1 FROM public.qrc_ia_rattrapages_historiques h WHERE h.attempt_id = p_attempt) THEN RETURN 'hors_periode'; END IF;
 SELECT type_apprenant, modalite_formation INTO ap FROM public.apprenants WHERE id=a.apprenant_id;
 IF NOT FOUND OR NOT public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation) THEN RETURN 'non_elearning'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.qrc_instances_v2 q WHERE q.attempt_id=p_attempt AND q.etat='en_attente' AND q.reponse IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id)) THEN RETURN 'rien_a_corriger'; END IF;
 RETURN 'admissible';
END $function$;