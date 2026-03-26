
-- Deduplicate questions within each exercise of module_editor_state
-- Uses a PL/pgSQL block to iterate and remove duplicate questions by enonce
DO $$
DECLARE
  rec RECORD;
  md jsonb;
  exercices jsonb;
  exo jsonb;
  questions jsonb;
  new_questions jsonb;
  new_exercices jsonb;
  q jsonb;
  seen_enonces text[];
  enonce_val text;
  has_changes boolean;
  i int;
BEGIN
  FOR rec IN SELECT id, module_id, module_data FROM module_editor_state
    WHERE jsonb_array_length(COALESCE(module_data->'exercices', '[]'::jsonb)) > 0
  LOOP
    md := rec.module_data;
    exercices := md->'exercices';
    new_exercices := '[]'::jsonb;
    has_changes := false;

    FOR i IN 0..jsonb_array_length(exercices) - 1 LOOP
      exo := exercices->i;
      questions := COALESCE(exo->'questions', '[]'::jsonb);
      
      IF jsonb_array_length(questions) = 0 THEN
        new_exercices := new_exercices || jsonb_build_array(exo);
        CONTINUE;
      END IF;

      seen_enonces := ARRAY[]::text[];
      new_questions := '[]'::jsonb;

      FOR q IN SELECT * FROM jsonb_array_elements(questions) LOOP
        enonce_val := trim(q->>'enonce');
        IF enonce_val = ANY(seen_enonces) THEN
          has_changes := true;
          CONTINUE;
        END IF;
        seen_enonces := array_append(seen_enonces, enonce_val);
        new_questions := new_questions || jsonb_build_array(q);
      END LOOP;

      new_exercices := new_exercices || jsonb_build_array(
        jsonb_set(exo, '{questions}', new_questions)
      );
    END LOOP;

    IF has_changes THEN
      UPDATE module_editor_state 
      SET module_data = jsonb_set(md, '{exercices}', new_exercices),
          updated_at = now()
      WHERE id = rec.id;
      RAISE NOTICE 'Deduplicated module %', rec.module_id;
    END IF;
  END LOOP;
END;
$$;
