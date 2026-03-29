
DO $$
DECLARE
  rec RECORD;
  md jsonb;
  exercices jsonb;
  exo_ids int[];
  dev_comm jsonb;
  regl_vtc jsonb;
  source_md jsonb;
BEGIN
  -- Get Dev Commercial (ID 7) and Réglementation VTC (ID 72) from module 41
  SELECT module_data INTO source_md FROM module_editor_state WHERE module_id = 41;
  
  IF source_md IS NULL THEN
    RAISE NOTICE 'Module 41 not found — skipping data migration on fresh DB';
    RETURN;
  END IF;
  
  SELECT e INTO dev_comm FROM jsonb_array_elements(source_md->'exercices') e WHERE (e->>'id')::int = 7;
  SELECT e INTO regl_vtc FROM jsonb_array_elements(source_md->'exercices') e WHERE (e->>'id')::int = 72;
  
  IF dev_comm IS NULL OR regl_vtc IS NULL THEN
    RAISE NOTICE 'Dev Commercial or Réglementation VTC not found — skipping';
    RETURN;
  END IF;

  -- Add them to modules 2, 14, 15, 20, 21 (VTC-related modules)
  FOR rec IN SELECT id, module_id, module_data FROM module_editor_state WHERE module_id IN (2, 14, 15, 20, 21)
  LOOP
    md := rec.module_data;
    exercices := COALESCE(md->'exercices', '[]'::jsonb);
    
    SELECT array_agg((e->>'id')::int) INTO exo_ids FROM jsonb_array_elements(exercices) e;
    
    IF NOT (7 = ANY(COALESCE(exo_ids, ARRAY[]::int[]))) THEN
      exercices := exercices || jsonb_build_array(dev_comm);
    END IF;
    
    IF NOT (72 = ANY(COALESCE(exo_ids, ARRAY[]::int[]))) THEN
      exercices := exercices || jsonb_build_array(regl_vtc);
    END IF;
    
    UPDATE module_editor_state 
    SET module_data = jsonb_set(md, '{exercices}', exercices),
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END;
$$;
