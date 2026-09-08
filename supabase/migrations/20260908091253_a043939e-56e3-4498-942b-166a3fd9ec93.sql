CREATE OR REPLACE FUNCTION public.sync_admin_canonical_quiz_questions(p_module_id integer, p_exercises jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  ex jsonb;
  q jsonb;
  deleted_id jsonb;
  pos integer;
  edited_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  FOR b IN
    SELECT *
    FROM public.quiz_question_bindings
    WHERE module_id = p_module_id
  LOOP
    ex := NULL;
    SELECT value INTO ex
    FROM jsonb_array_elements(COALESCE(p_exercises, '[]'::jsonb))
    WHERE (value->>'id')::bigint = b.exercise_id
    LIMIT 1;

    IF ex IS NULL THEN
      CONTINUE;
    END IF;

    pos := 0;
    FOR q IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(ex->'questions', '[]'::jsonb))
    LOOP
      IF NOT (q ? 'id') THEN
        CONTINUE;
      END IF;

      pos := pos + 1;
      BEGIN
        edited_at := NULLIF(q->>'_editedAt', '')::timestamptz;
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
        edited_at := NULL;
      END;

      IF edited_at IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO public.quiz_questions(
        quiz_id,
        section_id,
        legacy_question_id,
        position,
        enonce,
        choix,
        image,
        image_size,
        explication,
        active,
        source,
        updated_by_fournisseur_id,
        updated_at
      )
      VALUES(
        b.quiz_id,
        b.section_id,
        (q->>'id')::bigint,
        pos,
        COALESCE(q->>'enonce', ''),
        COALESCE(q->'choix', '[]'::jsonb),
        q->>'image',
        q->>'imageSize',
        q->>'explication',
        true,
        'admin',
        NULL,
        edited_at
      )
      ON CONFLICT (quiz_id, section_id, legacy_question_id) DO UPDATE SET
        position = EXCLUDED.position,
        enonce = EXCLUDED.enonce,
        choix = EXCLUDED.choix,
        image = EXCLUDED.image,
        image_size = EXCLUDED.image_size,
        explication = EXCLUDED.explication,
        source = 'admin',
        updated_by_fournisseur_id = NULL,
        updated_at = EXCLUDED.updated_at
      WHERE quiz_questions.active = true
        AND EXCLUDED.updated_at > quiz_questions.updated_at;
    END LOOP;

    FOR deleted_id IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(ex->'deletedQuestionIds', '[]'::jsonb))
    LOOP
      UPDATE public.quiz_questions
      SET
        active = false,
        source = 'admin',
        updated_by_fournisseur_id = NULL,
        updated_at = clock_timestamp()
      WHERE quiz_id = b.quiz_id
        AND section_id = b.section_id
        AND legacy_question_id = (deleted_id #>> '{}')::bigint
        AND active = true;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) TO authenticated, service_role;