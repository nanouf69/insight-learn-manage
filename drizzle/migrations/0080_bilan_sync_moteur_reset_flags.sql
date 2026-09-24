DO $mig$
DECLARE v_src text;
BEGIN
  SELECT pg_get_functiondef('public.bilan_sync_enregistrer(uuid,text,jsonb,text,text)'::regprocedure) INTO v_src;
  v_src := replace(v_src,
    '  PERFORM set_config(''app.shared_exercice_sync'', ''1'', true);',
    '  v_prev_shared := coalesce(current_setting(''app.shared_exercice_sync'', true), '''');
  PERFORM set_config(''app.shared_exercice_sync'', ''1'', true);');
  v_src := replace(v_src,
    '  v_now text :=',
    '  v_prev_shared text;
  v_now text :=');
  v_src := replace(v_src,
    '    RETURN jsonb_build_object(''statut'', ''aucun_changement'', ''lien_id'', l.id);',
    '    PERFORM set_config(''app.shared_exercice_sync'', v_prev_shared, true);
    PERFORM set_config(''app.bilan_sync_en_cours'', ''0'', true);
    RETURN jsonb_build_object(''statut'', ''aucun_changement'', ''lien_id'', l.id);');
  v_src := replace(v_src,
    '  RETURN jsonb_build_object(''statut'', ''synchronise''',
    '  PERFORM set_config(''app.shared_exercice_sync'', v_prev_shared, true);
  PERFORM set_config(''app.bilan_sync_en_cours'', ''0'', true);
  RETURN jsonb_build_object(''statut'', ''synchronise''');
  IF v_src NOT LIKE '%v_prev_shared text;%' OR (length(v_src) - length(replace(v_src, 'bilan_sync_en_cours'', ''0''', ''))) = 0 THEN
    RAISE EXCEPTION 'patch non applique';
  END IF;
  EXECUTE v_src;
END $mig$;