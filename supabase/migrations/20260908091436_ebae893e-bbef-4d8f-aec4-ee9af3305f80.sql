DO $$
DECLARE
  target public.quiz_questions%ROWTYPE;
  active_after boolean;
  test_exercises jsonb;
BEGIN
  SELECT * INTO target
  FROM public.quiz_questions
  WHERE active = false
  ORDER BY updated_at DESC
  LIMIT 1;

  IF target.question_id IS NULL THEN
    RAISE EXCEPTION 'no_inactive_canonical_question_available_for_regression_check';
  END IF;

  test_exercises := jsonb_build_array(
    jsonb_build_object(
      'id', target.section_id,
      'questions', jsonb_build_array(
        jsonb_build_object(
          'id', target.legacy_question_id,
          'enonce', target.enonce,
          'choix', target.choix,
          '_editedAt', to_char(clock_timestamp() + interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      )
    )
  );

  INSERT INTO public.quiz_question_bindings(quiz_id, module_id, exercise_id, section_id)
  SELECT target.quiz_id, -2147483647, target.section_id, target.section_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_question_bindings
    WHERE quiz_id = target.quiz_id
      AND module_id = -2147483647
      AND exercise_id = target.section_id
      AND section_id = target.section_id
  );

  UPDATE public.quiz_questions
  SET
    position = position,
    enonce = enonce,
    choix = choix,
    image = image,
    image_size = image_size,
    explication = explication,
    source = 'admin',
    updated_by_fournisseur_id = NULL,
    updated_at = clock_timestamp() + interval '1 hour'
  WHERE quiz_id = target.quiz_id
    AND section_id = target.section_id
    AND legacy_question_id = target.legacy_question_id
    AND active = true;

  SELECT active INTO active_after
  FROM public.quiz_questions
  WHERE question_id = target.question_id;

  IF active_after IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'regression_check_failed_deleted_question_reactivated';
  END IF;

  DELETE FROM public.quiz_question_bindings
  WHERE quiz_id = target.quiz_id
    AND module_id = -2147483647
    AND exercise_id = target.section_id
    AND section_id = target.section_id;
END;
$$;