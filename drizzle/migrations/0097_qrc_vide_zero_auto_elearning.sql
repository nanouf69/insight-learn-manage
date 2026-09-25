-- Règle validée le 25/09/2026 : FUTURS passages e-learning du nouveau système uniquement.
-- Une QRC du snapshot sans aucune réponse (ni actuelle, ni dans l'historique) vaut 0 à la
-- finalisation serveur, sans IA, avec la mention « QRC laissée sans réponse ».
-- Aucun rattrapage historique : ne s'exécute que dans core_finalize_attempt (tentative en_cours).

CREATE OR REPLACE FUNCTION public.core_reponse_qrc_vide(p jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT p IS NULL
      OR jsonb_typeof(p) = 'null'
      OR (jsonb_typeof(p) = 'string' AND btrim(p #>> '{}', E' \t\r\n') = '')
      OR (jsonb_typeof(p) = 'array' AND jsonb_array_length(p) = 0)
      OR (jsonb_typeof(p) = 'object' AND p = '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION public.core_est_elearning(p_type text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT coalesce(btrim(lower(p_type)), '') <> ''
     AND (lower(p_type) LIKE '%e-learning%' OR lower(p_type) LIKE '%elearning%'
          OR lower(btrim(p_type)) ~ '(^|[\s-])[a-z]{2,4}-e($|-)' OR lower(btrim(p_type)) LIKE '%-e')
$$;

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
  rejeu := public.core_operation_replay(p_operation_id, 'attempt_finalize');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', p_attempt_id USING ERRCODE = 'P0477';
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