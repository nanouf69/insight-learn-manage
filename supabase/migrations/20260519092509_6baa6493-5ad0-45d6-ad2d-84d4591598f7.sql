DO $$
DECLARE
  v_clean jsonb;
  v_new_exos jsonb := '[]'::jsonb;
  v_exo jsonb;
BEGIN
  SELECT e
    INTO v_clean
  FROM public.module_editor_state,
       jsonb_array_elements(module_data->'exercices') e
  WHERE module_id = 9 AND (e->>'id') = '100'
  LIMIT 1;

  IF v_clean IS NULL THEN
    RAISE EXCEPTION 'Version propre du bilan T3P introuvable';
  END IF;

  FOR v_exo IN
    SELECT elem
    FROM public.module_editor_state m,
         jsonb_array_elements(m.module_data->'exercices') WITH ORDINALITY arr(elem, ord)
    WHERE m.module_id = 4
    ORDER BY arr.ord
  LOOP
    IF (v_exo->>'id') = '100' THEN
      v_new_exos := v_new_exos || jsonb_build_array(v_clean);
    ELSE
      v_new_exos := v_new_exos || jsonb_build_array(v_exo);
    END IF;
  END LOOP;

  UPDATE public.module_editor_state
     SET module_data = jsonb_set(module_data, '{exercices}', v_new_exos),
         updated_at = now()
   WHERE module_id = 4;
END$$;