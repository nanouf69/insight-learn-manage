DO $$
DECLARE
  target public.quiz_questions%ROWTYPE;
  linked_module integer;
  admin_user uuid;
  test_marker text := '__canonical_sync_active_test__';
  updated_text text;
  test_exercises jsonb;
BEGIN
  SELECT q.* INTO target
  FROM public.quiz_questions q
  WHERE q.active = true
    AND EXISTS (
      SELECT 1 FROM public.quiz_question_bindings b
      WHERE b.quiz_id = q.quiz_id AND b.section_id = q.section_id
    )
  ORDER BY q.updated_at DESC
  LIMIT 1;

  SELECT b.module_id INTO linked_module
  FROM public.quiz_question_bindings b
  WHERE b.quiz_id = target.quiz_id AND b.section_id = target.section_id
  ORDER BY b.module_id LIMIT 1;

  SELECT ur.user_id INTO admin_user
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
  ORDER BY ur.user_id LIMIT 1;

  PERFORM set_config('request.jwt.claim.sub', admin_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  test_exercises := jsonb_build_array(jsonb_build_object(
    'id', target.section_id,
    'questions', jsonb_build_array(jsonb_build_object(
      'id', target.legacy_question_id,
      'enonce', test_marker,
      'choix', target.choix,
      '_editedAt', to_char(target.updated_at + interval '1 second', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ))
  ));

  PERFORM public.sync_admin_canonical_quiz_questions(linked_module, test_exercises);
  SELECT enonce INTO updated_text FROM public.quiz_questions WHERE question_id = target.question_id;
  IF updated_text IS DISTINCT FROM test_marker THEN
    RAISE EXCEPTION 'active_question_update_regression';
  END IF;

  RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'rollback_expected';
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  IF SQLERRM <> 'rollback_expected' THEN RAISE; END IF;
END;
$$;