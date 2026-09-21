-- Les refus doivent laisser une trace : on retourne un refus explicite au lieu de lever
-- une exception (qui annulait aussi l'écriture du journal).
CREATE OR REPLACE FUNCTION public.canonical_update_question(
  p_question_id UUID,
  p_expected_version INTEGER,
  p_fields JSONB,
  p_origin TEXT DEFAULT 'admin'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.canonical_questions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.canonical_questions
   WHERE question_id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question canonique introuvable' USING ERRCODE = 'P0404';
  END IF;

  IF v_row.version <> p_expected_version THEN
    INSERT INTO public.canonical_question_write_log
      (question_id, expected_version, server_version_before, resulting_version, accepted, reason, origin, payload)
    VALUES (p_question_id, p_expected_version, v_row.version, v_row.version, false,
            'stale_write_refused', p_origin, p_fields);
    RETURN jsonb_build_object(
      'accepted', false,
      'reason', 'stale_write_refused',
      'server_version', v_row.version,
      'expected_version', p_expected_version,
      'question', to_jsonb(v_row)
    );
  END IF;

  UPDATE public.canonical_questions SET
    type = COALESCE(p_fields->>'type', type),
    enonce = COALESCE(p_fields->>'enonce', enonce),
    choix = COALESCE(p_fields->'choix', choix),
    bonnes_reponses = COALESCE(p_fields->'bonnes_reponses', bonnes_reponses),
    explication = COALESCE(p_fields->>'explication', explication),
    explications_choix = COALESCE(p_fields->'explications_choix', explications_choix),
    reponse_qrc = COALESCE(p_fields->>'reponse_qrc', reponse_qrc),
    mots_cles = COALESCE(p_fields->'mots_cles', mots_cles),
    bareme = COALESCE((p_fields->>'bareme')::numeric, bareme),
    coefficient = COALESCE((p_fields->>'coefficient')::numeric, coefficient),
    medias = COALESCE(p_fields->'medias', medias),
    proprietes = COALESCE(p_fields->'proprietes', proprietes),
    version = version + 1,
    updated_at = now()
  WHERE question_id = p_question_id
  RETURNING * INTO v_row;

  INSERT INTO public.canonical_question_write_log
    (question_id, expected_version, server_version_before, resulting_version, accepted, reason, origin, payload)
  VALUES (p_question_id, p_expected_version, p_expected_version, v_row.version, true, 'accepted', p_origin, p_fields);

  RETURN jsonb_build_object('accepted', true, 'server_version', v_row.version, 'question', to_jsonb(v_row));
END;
$$;
