
DO $$
DECLARE
  edit_ts timestamptz := '2026-07-13T09:28:33.651Z';
  new_choix jsonb := '[
    {"lettre":"A","texte":"Registre du commerce et des sociétés"},
    {"lettre":"B","texte":"Répertoire des métiers","correct":true},
    {"lettre":"C","texte":"Les deux","correct":false}
  ]'::jsonb;
  new_enonce text := 'Auprès de quel organisme doit s''immatriculer un VTC ou Taxi exploitant individuel ?';
  r record;
  new_module jsonb;
  ex jsonb;
  q jsonb;
  new_exs jsonb := '[]'::jsonb;
  new_qs jsonb;
  touched boolean;
  any_touched boolean;
  q_edited_at timestamptz;
BEGIN
  FOR r IN
    SELECT module_id, module_data FROM module_editor_state
    WHERE module_id <> 4
      AND module_data::text ILIKE '%immatriculer un VTC ou Taxi exploitant%'
  LOOP
    any_touched := false;
    new_exs := '[]'::jsonb;
    FOR ex IN SELECT * FROM jsonb_array_elements(r.module_data->'exercices')
    LOOP
      touched := false;
      new_qs := '[]'::jsonb;
      IF jsonb_typeof(ex->'questions') = 'array' THEN
        FOR q IN SELECT * FROM jsonb_array_elements(ex->'questions')
        LOOP
          IF lower(regexp_replace(coalesce(q->>'enonce',''), '\s+', ' ', 'g'))
             LIKE '%immatriculer un vtc ou taxi exploitant%' THEN
            q_edited_at := NULLIF(q->>'_editedAt','')::timestamptz;
            IF q_edited_at IS NULL OR q_edited_at < edit_ts THEN
              q := q
                 || jsonb_build_object('enonce', new_enonce)
                 || jsonb_build_object('choix', new_choix)
                 || jsonb_build_object('_editedAt', edit_ts);
              touched := true;
            END IF;
          END IF;
          new_qs := new_qs || jsonb_build_array(q);
        END LOOP;
      END IF;
      IF touched THEN
        ex := jsonb_set(ex, '{questions}', new_qs);
        any_touched := true;
      END IF;
      new_exs := new_exs || jsonb_build_array(ex);
    END LOOP;

    IF any_touched THEN
      new_module := jsonb_set(r.module_data, '{exercices}', new_exs);
      UPDATE module_editor_state
        SET module_data = new_module, updated_at = now()
        WHERE module_id = r.module_id;
      RAISE NOTICE 'Propagated to module %', r.module_id;
    END IF;
  END LOOP;
END $$;
