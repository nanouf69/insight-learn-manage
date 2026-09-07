CREATE OR REPLACE FUNCTION public.save_canonical_quiz_question(
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
  p_active boolean DEFAULT true
)
RETURNS public.quiz_questions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_fournisseur_id uuid; v_row public.quiz_questions;
BEGIN
  SELECT id INTO v_fournisseur_id FROM public.fournisseurs
  WHERE token=p_fournisseur_token AND actif=true;
  IF v_fournisseur_id IS NULL THEN
    RAISE EXCEPTION 'invalid_fournisseur_token' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.quiz_question_bindings
    WHERE quiz_id=p_quiz_id AND section_id=p_section_id
  ) THEN
    RAISE EXCEPTION 'unknown_quiz_section' USING ERRCODE='22023';
  END IF;
  IF p_legacy_question_id IS NULL OR p_legacy_question_id < 1 OR p_position < 1 THEN
    RAISE EXCEPTION 'invalid_question_identity' USING ERRCODE='22023';
  END IF;
  IF p_active AND (btrim(COALESCE(p_enonce,''))='' OR jsonb_typeof(COALESCE(p_choix,'[]'::jsonb)) <> 'array') THEN
    RAISE EXCEPTION 'invalid_question_content' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.quiz_questions(
    quiz_id,section_id,legacy_question_id,position,enonce,choix,image,image_size,
    explication,active,source,updated_by_fournisseur_id,updated_at
  )
  VALUES(
    p_quiz_id,p_section_id,p_legacy_question_id,p_position,COALESCE(p_enonce,''),
    COALESCE(p_choix,'[]'::jsonb),p_image,p_image_size,p_explication,p_active,
    'fournisseur',v_fournisseur_id,clock_timestamp()
  )
  ON CONFLICT (quiz_id,section_id,legacy_question_id) DO UPDATE SET
    position=EXCLUDED.position,
    enonce=EXCLUDED.enonce,
    choix=EXCLUDED.choix,
    image=EXCLUDED.image,
    image_size=EXCLUDED.image_size,
    explication=EXCLUDED.explication,
    active=EXCLUDED.active,
    source='fournisseur',
    updated_by_fournisseur_id=v_fournisseur_id,
    updated_at=clock_timestamp()
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.save_canonical_quiz_question(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_canonical_quiz_question(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.sync_admin_canonical_quiz_questions(p_module_id integer, p_exercises jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  b record;
  ex jsonb;
  q jsonb;
  deleted_id jsonb;
  pos integer;
  edited_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';
  END IF;

  FOR b IN SELECT * FROM public.quiz_question_bindings WHERE module_id=p_module_id LOOP
    SELECT value INTO ex
    FROM jsonb_array_elements(COALESCE(p_exercises,'[]'::jsonb))
    WHERE (value->>'id')::bigint=b.exercise_id
    LIMIT 1;
    IF ex IS NULL THEN CONTINUE; END IF;

    pos := 0;
    FOR q IN SELECT value FROM jsonb_array_elements(COALESCE(ex->'questions','[]'::jsonb)) LOOP
      IF NOT (q ? 'id') THEN CONTINUE; END IF;
      pos := pos+1;
      BEGIN
        edited_at := NULLIF(q->>'_editedAt','')::timestamptz;
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
        edited_at := NULL;
      END;

      IF edited_at IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO public.quiz_questions(
        quiz_id,section_id,legacy_question_id,position,enonce,choix,image,image_size,
        explication,active,source,updated_by_fournisseur_id,updated_at
      )
      VALUES(
        b.quiz_id,b.section_id,(q->>'id')::bigint,pos,COALESCE(q->>'enonce',''),
        COALESCE(q->'choix','[]'::jsonb),q->>'image',q->>'imageSize',q->>'explication',
        true,'admin',NULL,edited_at
      )
      ON CONFLICT (quiz_id,section_id,legacy_question_id) DO UPDATE SET
        position=EXCLUDED.position,
        enonce=EXCLUDED.enonce,
        choix=EXCLUDED.choix,
        image=EXCLUDED.image,
        image_size=EXCLUDED.image_size,
        explication=EXCLUDED.explication,
        active=true,
        source='admin',
        updated_by_fournisseur_id=NULL,
        updated_at=EXCLUDED.updated_at
      WHERE EXCLUDED.updated_at > quiz_questions.updated_at;
    END LOOP;

    FOR deleted_id IN SELECT value FROM jsonb_array_elements(COALESCE(ex->'deletedQuestionIds','[]'::jsonb)) LOOP
      UPDATE public.quiz_questions
      SET active=false, source='admin', updated_by_fournisseur_id=NULL, updated_at=clock_timestamp()
      WHERE quiz_id=b.quiz_id
        AND section_id=b.section_id
        AND legacy_question_id=(deleted_id #>> '{}')::bigint
        AND active=true;
    END LOOP;
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.sync_admin_canonical_quiz_questions(integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer,jsonb) TO authenticated,service_role;