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

REVOKE ALL ON FUNCTION public.save_canonical_quiz_question_v2(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_canonical_quiz_question_v2(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean,timestamptz) TO service_role;

COMMENT ON FUNCTION public.save_canonical_quiz_question_v2(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean,timestamptz) IS
  'Sauvegarde fournisseur atomique avec contrôle de version empêchant tout écrasement ou réactivation depuis un écran obsolète.';