CREATE OR REPLACE FUNCTION public.apply_admin_canonical_quiz_actions(
  p_module_id integer,
  p_actions jsonb
)
RETURNS SETOF public.quiz_questions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  action_row jsonb;
  binding_row public.quiz_question_bindings%ROWTYPE;
  current_row public.quiz_questions%ROWTYPE;
  saved_row public.quiz_questions%ROWTYPE;
  action_name text;
  legacy_id bigint;
  expected_updated_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(COALESCE(p_actions, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'invalid_canonical_actions' USING ERRCODE = '22023';
  END IF;

  FOR action_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_actions, '[]'::jsonb))
  LOOP
    action_name := action_row->>'action';
    legacy_id := NULLIF(action_row->>'legacy_question_id', '')::bigint;

    SELECT * INTO binding_row
    FROM public.quiz_question_bindings
    WHERE module_id = p_module_id
      AND exercise_id = NULLIF(action_row->>'exercise_id', '')::bigint
      AND quiz_id = action_row->>'quiz_id'
      AND section_id = NULLIF(action_row->>'section_id', '')::bigint
    LIMIT 1;

    IF NOT FOUND OR legacy_id IS NULL OR legacy_id < 1 THEN
      RAISE EXCEPTION 'unknown_canonical_question_binding' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO current_row
    FROM public.quiz_questions
    WHERE quiz_id = binding_row.quiz_id
      AND section_id = binding_row.section_id
      AND legacy_question_id = legacy_id
    FOR UPDATE;

    expected_updated_at := NULL;
    BEGIN
      expected_updated_at := NULLIF(action_row->>'expected_updated_at', '')::timestamptz;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      RAISE EXCEPTION 'invalid_expected_updated_at' USING ERRCODE = '22023';
    END;

    IF FOUND THEN
      IF expected_updated_at IS NULL OR current_row.updated_at <> expected_updated_at THEN
        RAISE EXCEPTION 'stale_canonical_question_write' USING ERRCODE = 'P0409';
      END IF;
    ELSIF expected_updated_at IS NOT NULL OR action_name = 'deactivate' THEN
      RAISE EXCEPTION 'stale_canonical_question_write' USING ERRCODE = 'P0409';
    END IF;

    IF action_name = 'deactivate' THEN
      UPDATE public.quiz_questions
      SET active = false,
          source = 'admin',
          updated_by_fournisseur_id = NULL,
          updated_at = clock_timestamp()
      WHERE question_id = current_row.question_id
      RETURNING * INTO saved_row;
    ELSIF action_name = 'upsert' THEN
      IF current_row.question_id IS NOT NULL AND current_row.active = false THEN
        RAISE EXCEPTION 'canonical_question_deleted' USING ERRCODE = 'P0409';
      END IF;
      IF btrim(COALESCE(action_row->>'enonce', '')) = ''
         OR jsonb_typeof(COALESCE(action_row->'choix', '[]'::jsonb)) <> 'array'
         OR COALESCE((action_row->>'position')::integer, 0) < 1 THEN
        RAISE EXCEPTION 'invalid_question_content' USING ERRCODE = '22023';
      END IF;

      IF current_row.question_id IS NULL THEN
        INSERT INTO public.quiz_questions(
          quiz_id, section_id, legacy_question_id, position, enonce, choix,
          image, image_size, explication, active, source,
          updated_by_fournisseur_id, updated_at
        ) VALUES (
          binding_row.quiz_id, binding_row.section_id, legacy_id,
          (action_row->>'position')::integer, action_row->>'enonce',
          COALESCE(action_row->'choix', '[]'::jsonb),
          NULLIF(action_row->>'image', ''), NULLIF(action_row->>'image_size', ''),
          NULLIF(action_row->>'explication', ''), true, 'admin', NULL,
          clock_timestamp()
        ) RETURNING * INTO saved_row;
      ELSE
        UPDATE public.quiz_questions
        SET position = (action_row->>'position')::integer,
            enonce = action_row->>'enonce',
            choix = COALESCE(action_row->'choix', '[]'::jsonb),
            image = NULLIF(action_row->>'image', ''),
            image_size = NULLIF(action_row->>'image_size', ''),
            explication = NULLIF(action_row->>'explication', ''),
            source = 'admin',
            updated_by_fournisseur_id = NULL,
            updated_at = clock_timestamp()
        WHERE question_id = current_row.question_id
          AND active = true
        RETURNING * INTO saved_row;
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid_canonical_action' USING ERRCODE = '22023';
    END IF;

    RETURN NEXT saved_row;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_canonical_quiz_question_v2(
  p_fournisseur_token text,
  p_quiz_id text,
  p_section_id bigint,
  p_legacy_question_id bigint,
  p_position integer,
  p_enonce text,
  p_choix jsonb,
  p_image text DEFAULT NULL,
  p_image_size text DEFAULT NULL,
  p_explication text DEFAULT NULL,
  p_active boolean DEFAULT true,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS public.quiz_questions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_fournisseur_id uuid;
  v_current public.quiz_questions%ROWTYPE;
  v_row public.quiz_questions%ROWTYPE;
BEGIN
  SELECT id INTO v_fournisseur_id
  FROM public.fournisseurs
  WHERE token = p_fournisseur_token AND actif = true;

  IF v_fournisseur_id IS NULL THEN
    RAISE EXCEPTION 'invalid_fournisseur_token' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.quiz_question_bindings
    WHERE quiz_id = p_quiz_id AND section_id = p_section_id
  ) THEN
    RAISE EXCEPTION 'unknown_quiz_section' USING ERRCODE = '22023';
  END IF;

  IF p_legacy_question_id IS NULL OR p_legacy_question_id < 1 OR p_position < 1 THEN
    RAISE EXCEPTION 'invalid_question_identity' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_current
  FROM public.quiz_questions
  WHERE quiz_id = p_quiz_id
    AND section_id = p_section_id
    AND legacy_question_id = p_legacy_question_id
  FOR UPDATE;

  IF FOUND THEN
    IF p_expected_updated_at IS NULL OR v_current.updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION 'stale_canonical_question_write' USING ERRCODE = 'P0409';
    END IF;
  ELSIF p_expected_updated_at IS NOT NULL OR NOT p_active THEN
    RAISE EXCEPTION 'stale_canonical_question_write' USING ERRCODE = 'P0409';
  END IF;

  IF v_current.question_id IS NOT NULL AND v_current.active = false AND p_active THEN
    RAISE EXCEPTION 'canonical_question_deleted' USING ERRCODE = 'P0409';
  END IF;

  IF p_active AND (
    btrim(COALESCE(p_enonce, '')) = ''
    OR jsonb_typeof(COALESCE(p_choix, '[]'::jsonb)) <> 'array'
  ) THEN
    RAISE EXCEPTION 'invalid_question_content' USING ERRCODE = '22023';
  END IF;

  IF v_current.question_id IS NULL THEN
    INSERT INTO public.quiz_questions(
      quiz_id, section_id, legacy_question_id, position, enonce, choix,
      image, image_size, explication, active, source,
      updated_by_fournisseur_id, updated_at
    ) VALUES (
      p_quiz_id, p_section_id, p_legacy_question_id, p_position,
      COALESCE(p_enonce, ''), COALESCE(p_choix, '[]'::jsonb),
      p_image, p_image_size, p_explication, p_active, 'fournisseur',
      v_fournisseur_id, clock_timestamp()
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.quiz_questions
    SET position = p_position,
        enonce = COALESCE(p_enonce, ''),
        choix = COALESCE(p_choix, '[]'::jsonb),
        image = p_image,
        image_size = p_image_size,
        explication = p_explication,
        active = p_active,
        source = 'fournisseur',
        updated_by_fournisseur_id = v_fournisseur_id,
        updated_at = clock_timestamp()
    WHERE question_id = v_current.question_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_canonical_quiz_question_v2(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_canonical_quiz_question_v2(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean,timestamptz) TO service_role;

COMMENT ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) IS
  'Applique les actions Admin sans permettre à un upsert de réactiver une question supprimée.';
COMMENT ON FUNCTION public.save_canonical_quiz_question_v2(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean,timestamptz) IS
  'Sauvegarde fournisseur atomique; une question inactive ne peut être réactivée par une ancienne vue.';