CREATE OR REPLACE FUNCTION public.sync_bilan_from_cours(_src_module integer, _dst_module integer, _log_removed boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_map jsonb; v_bloc jsonb; v_src text; v_part jsonb; v_questions jsonb; v_old jsonb; v_merged jsonb; v_exos jsonb;
  v_total integer := 0;
BEGIN
  -- Reconstruction en AJOUT SEULEMENT : une question déjà présente dans le bilan n'est jamais retirée.
  SELECT b FROM jsonb_array_elements(public.bilan_sync_mapping()) b
  WHERE (b->>'src_module')::int = _src_module AND (b->>'dst_module')::int = _dst_module INTO v_map;
  IF v_map IS NULL THEN RETURN 0; END IF;

  SELECT module_data->'exercices' INTO v_exos FROM public.module_editor_state WHERE module_id = _dst_module;
  IF v_exos IS NULL THEN RETURN 0; END IF;

  FOR v_bloc IN SELECT * FROM jsonb_array_elements(v_map->'blocs') LOOP
    v_questions := '[]'::jsonb;
    FOR v_src IN SELECT jsonb_array_elements_text(v_bloc->'sources') LOOP
      SELECT coalesce(jsonb_agg((qq.q - 'id') || jsonb_build_object(
                    'id', (v_src::int * 1000 + (qq.q->>'id')::int),
                    'source_module_id', _src_module, 'source_exercice_id', v_src,
                    'source_question_id', qq.q->>'id', 'synced_from_cours', true)
               ORDER BY qq.idx), '[]'::jsonb)
      INTO v_part
      FROM public.module_editor_state m, jsonb_array_elements(m.module_data->'exercices') e,
           jsonb_array_elements(e->'questions') WITH ORDINALITY qq(q, idx)
      WHERE m.module_id = _src_module AND e->>'id' = v_src;
      v_questions := v_questions || coalesce(v_part, '[]'::jsonb);
    END LOOP;

    SELECT coalesce(e->'questions','[]'::jsonb) INTO v_old FROM jsonb_array_elements(v_exos) e WHERE e->>'id' = (v_bloc->>'bloc') LIMIT 1;
    v_old := coalesce(v_old, '[]'::jsonb);

    -- anciennes questions dans leur ordre (version source si elle existe encore), puis nouvelles questions
    SELECT coalesce(jsonb_agg(x.q ORDER BY x.o1, x.o2), '[]'::jsonb) INTO v_merged FROM (
      SELECT coalesce(n.q, o.q) q, 0 o1, o.idx o2
      FROM jsonb_array_elements(v_old) WITH ORDINALITY o(q, idx)
      LEFT JOIN LATERAL (SELECT nq q FROM jsonb_array_elements(v_questions) nq WHERE nq->>'id' = o.q->>'id' LIMIT 1) n ON true
      UNION ALL
      SELECT nq.q, 1, nq.idx FROM jsonb_array_elements(v_questions) WITH ORDINALITY nq(q, idx)
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_old) oq WHERE oq->>'id' = nq.q->>'id')
    ) x;

    SELECT jsonb_agg(CASE WHEN e.e->>'id' = (v_bloc->>'bloc') THEN jsonb_set(e.e, '{questions}', v_merged) ELSE e.e END ORDER BY e.idx)
    INTO v_exos FROM jsonb_array_elements(v_exos) WITH ORDINALITY e(e, idx);

    v_total := v_total + jsonb_array_length(v_merged);
  END LOOP;

  UPDATE public.module_editor_state SET module_data = jsonb_set(module_data, '{exercices}', v_exos), updated_at = now()
  WHERE module_id = _dst_module AND module_data->'exercices' IS DISTINCT FROM v_exos;

  RETURN v_total;
END;
$function$;