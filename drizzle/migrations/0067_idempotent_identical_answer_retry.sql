CREATE OR REPLACE FUNCTION public.core_save_answer(
  p_operation_id uuid,
  p_attempt_id uuid,
  p_question_id text,
  p_valeur jsonb,
  p_expected_revision integer,
  p_session_origine text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  att public.exam_attempts_v2%ROWTYPE;
  courant public.answer_state%ROWTYPE;
  resultat jsonb;
BEGIN
  rejeu := public.core_operation_replay(p_operation_id, 'answer_save');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', p_attempt_id USING ERRCODE = 'P0477';
  END IF;

  SELECT * INTO courant FROM public.answer_state
  WHERE attempt_id = p_attempt_id AND question_id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    IF coalesce(p_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'ANSWER_STALE_REVISION: revision attendue % alors qu''aucune reponse n''existe.', p_expected_revision
        USING ERRCODE = 'P0409';
    END IF;

    INSERT INTO public.answer_state (attempt_id, apprenant_id, question_id, valeur, revision, updated_by, session_origine)
    VALUES (p_attempt_id, att.apprenant_id, p_question_id, p_valeur, 1, auth.uid(), p_session_origine)
    RETURNING * INTO courant;
  ELSE
    IF p_expected_revision IS NULL AND courant.valeur = p_valeur THEN
      resultat := jsonb_build_object(
        'response_id', courant.response_id,
        'attempt_id', courant.attempt_id,
        'question_id', courant.question_id,
        'revision', courant.revision
      );

      INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
      VALUES (p_operation_id, 'answer_save', att.apprenant_id, p_attempt_id, auth.uid(),
              jsonb_build_object('question_id', p_question_id, 'identical_retry', true), resultat);

      RETURN resultat;
    END IF;

    IF p_expected_revision IS DISTINCT FROM courant.revision THEN
      RAISE EXCEPTION 'ANSWER_STALE_REVISION: revision % obsolete (serveur = %).', p_expected_revision, courant.revision
        USING ERRCODE = 'P0409';
    END IF;

    UPDATE public.answer_state
    SET valeur = p_valeur,
        revision = courant.revision + 1,
        updated_by = auth.uid(),
        session_origine = p_session_origine
    WHERE response_id = courant.response_id
    RETURNING * INTO courant;
  END IF;

  resultat := jsonb_build_object(
    'response_id', courant.response_id,
    'attempt_id', courant.attempt_id,
    'question_id', courant.question_id,
    'revision', courant.revision
  );

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'answer_save', att.apprenant_id, p_attempt_id, auth.uid(),
          jsonb_build_object('question_id', p_question_id), resultat);

  RETURN resultat;
END;
$$;