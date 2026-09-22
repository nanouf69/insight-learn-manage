-- Correctif : la finalisation doit refuser explicitement toute question
-- absente du snapshot immuable de la tentative, meme si aucune reponse
-- n'existe pour cette question (sinon l'INSERT ... SELECT ne declenche
-- aucun controle et la tentative est finalisee a tort).
CREATE OR REPLACE FUNCTION public.core_finalize_attempt(
  p_operation_id uuid,
  p_attempt_id uuid,
  p_qrc_questions text[] DEFAULT '{}'::text[],
  p_resultat jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  att public.exam_attempts_v2%ROWTYPE;
  qid text;
  nb_qrc integer := 0;
  resultat jsonb;
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

  FOREACH qid IN ARRAY coalesce(p_qrc_questions, '{}'::text[]) LOOP
    IF NOT public.core_snapshot_has_question(att.snapshot, qid) THEN
      RAISE EXCEPTION 'QUESTION_HORS_SNAPSHOT: la question % ne fait pas partie du snapshot de la tentative % (examen %).',
        qid, att.attempt_id, att.exam_id
        USING ERRCODE = 'P0479';
    END IF;

    INSERT INTO public.qrc_instances_v2 (attempt_id, question_id, apprenant_id, reponse, etat)
    SELECT p_attempt_id, qid, att.apprenant_id,
           (SELECT valeur FROM public.answer_state WHERE attempt_id = p_attempt_id AND question_id = qid),
           'en_attente'
    ON CONFLICT (attempt_id, question_id) DO NOTHING;
    nb_qrc := nb_qrc + 1;
  END LOOP;

  UPDATE public.exam_attempts_v2
  SET etat = 'terminee', finished_at = now()
  WHERE attempt_id = p_attempt_id;

  resultat := jsonb_build_object('attempt_id', p_attempt_id, 'etat', 'terminee', 'qrc_creees', nb_qrc, 'resultat', p_resultat);

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'attempt_finalize', att.apprenant_id, p_attempt_id, auth.uid(),
          jsonb_build_object('qrc_questions', to_jsonb(p_qrc_questions)), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('attempt_finalize', 'exam_attempts_v2', p_attempt_id::text, att.exam_id, att.exam_version_id, p_attempt_id, att.apprenant_id, auth.uid(), resultat, 'core_finalize_attempt');

  RETURN resultat;
END;
$$;