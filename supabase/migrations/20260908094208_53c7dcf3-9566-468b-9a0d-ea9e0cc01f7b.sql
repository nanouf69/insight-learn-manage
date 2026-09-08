CREATE OR REPLACE FUNCTION public.apply_admin_canonical_quiz_actions(
  p_module_id integer,
  p_actions jsonb
)
RETURNS SETOF public.quiz_questions
LANGUAGE plpgsql
SECURITY DEFINER
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
            active = true,
            source = 'admin',
            updated_by_fournisseur_id = NULL,
            updated_at = clock_timestamp()
        WHERE question_id = current_row.question_id
        RETURNING * INTO saved_row;
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid_canonical_action' USING ERRCODE = '22023';
    END IF;

    RETURN NEXT saved_row;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_admin_canonical_quiz_questions(
  p_module_id integer,
  p_exercises jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  -- Ancien point d'entrée conservé uniquement pour compatibilité.
  -- Les snapshots module_editor_state ne sont plus autorisés à écrire dans
  -- quiz_questions : seules les actions explicites ci-dessus le peuvent.
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.apply_admin_canonical_quiz_actions(integer, jsonb) IS
  'Applique atomiquement les actions Admin explicites sur les questions canoniques avec verrou et contrôle de version.';
COMMENT ON FUNCTION public.sync_admin_canonical_quiz_questions(integer, jsonb) IS
  'Point de compatibilité sans écriture. Les anciennes copies JSON de module ne peuvent plus modifier la source canonique.';