DO $$
DECLARE
  target public.quiz_questions%ROWTYPE;
  linked_module integer;
  admin_user uuid;
  after_active boolean;
  stale_snapshot jsonb;
BEGIN
  SELECT q.* INTO target
  FROM public.quiz_questions q
  WHERE q.active = false
    AND EXISTS (
      SELECT 1
      FROM public.quiz_question_bindings b
      WHERE b.quiz_id = q.quiz_id
        AND b.section_id = q.section_id
    )
  ORDER BY q.updated_at DESC
  LIMIT 1;

  IF target.question_id IS NULL THEN
    RAISE EXCEPTION 'no_bound_inactive_question_for_regression_check';
  END IF;

  SELECT b.module_id INTO linked_module
  FROM public.quiz_question_bindings b
  WHERE b.quiz_id = target.quiz_id
    AND b.section_id = target.section_id
  ORDER BY b.module_id
  LIMIT 1;

  SELECT ur.user_id INTO admin_user
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
  ORDER BY ur.user_id
  LIMIT 1;

  IF admin_user IS NULL THEN
    RAISE EXCEPTION 'no_admin_for_regression_check';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', admin_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  stale_snapshot := jsonb_build_array(
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

  PERFORM public.sync_admin_canonical_quiz_questions(linked_module, stale_snapshot);

  SELECT active INTO after_active
  FROM public.quiz_questions
  WHERE question_id = target.question_id;

  IF after_active IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'regression_check_failed_deleted_question_reactivated';
  END IF;
END;
$$;