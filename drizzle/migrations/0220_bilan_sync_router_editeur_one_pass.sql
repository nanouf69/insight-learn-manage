-- Same contract as the previous bilan_sync_router_editeur, computed in one pass.
-- Previous version rescanned the full module JSON (~1 000 questions) 4 times per
-- linked question (290 links) and rebuilt it 290 times: ~4 s of the ~5 s admin
-- save of module 11, so saves hit the 8 s statement_timeout (57014) under load.
CREATE OR REPLACE FUNCTION public.bilan_sync_router_editeur(p_module_id integer, p_module_data jsonb, p_expected_updated_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_side text; v_row public.module_editor_state%ROWTYPE; v_cur jsonb;
  v_changed int := 0; v_data jsonb := p_module_data; v_list jsonb; r jsonb; v_rep jsonb; v_touched int := 0;
BEGIN
  IF p_module_id = 5 THEN v_side := 'vtc'; ELSIF p_module_id = 11 THEN v_side := 'taxi'; ELSE RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bilan_sync_liens WHERE statut = 'liee') THEN RETURN NULL; END IF;

  PERFORM 1 FROM public.module_editor_state WHERE module_id IN (5, 11) ORDER BY module_id FOR UPDATE;
  SELECT * INTO v_row FROM public.module_editor_state WHERE module_id = p_module_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  WITH l AS (
    SELECT id,
      (CASE WHEN v_side = 'vtc' THEN vtc_exercice_id ELSE taxi_exercice_id END)::text AS ex,
      (CASE WHEN v_side = 'vtc' THEN vtc_question_id ELSE taxi_question_id END)::text AS qid
    FROM public.bilan_sync_liens WHERE statut = 'liee'
  ), dbq AS (
    SELECT DISTINCT ON (x->>'id', q->>'id') x->>'id' AS ex, q->>'id' AS qid, q
    FROM jsonb_array_elements(public.jsonb_as_array(v_row.module_data->'exercices')) WITH ORDINALITY e(x, eo),
         jsonb_array_elements(public.jsonb_as_array(x->'questions')) WITH ORDINALITY qq(q, qo)
    WHERE x->>'id' IS NOT NULL AND q->>'id' IS NOT NULL
    ORDER BY x->>'id', q->>'id', eo, qo
  ), cliq AS (
    SELECT x->>'id' AS ex, q->>'id' AS qid, count(*) AS n, (array_agg(q ORDER BY eo, qo))[1] AS q
    FROM jsonb_array_elements(public.jsonb_as_array(p_module_data->'exercices')) WITH ORDINALITY e(x, eo),
         jsonb_array_elements(public.jsonb_as_array(x->'questions')) WITH ORDINALITY qq(q, qo)
    WHERE x->>'id' IS NOT NULL AND q->>'id' IS NOT NULL
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', l.id, 'qid', l.qid, 'db_q', d.q, 'cli_q', c.q, 'n', coalesce(c.n, 0)) ORDER BY l.id)
  INTO v_list
  FROM l
  JOIN dbq d ON d.ex = l.ex AND d.qid = l.qid
  LEFT JOIN cliq c ON c.ex = l.ex AND c.qid = l.qid
  WHERE c.q IS NULL OR public.bilan_sync_payload(c.q) IS DISTINCT FROM public.bilan_sync_payload(d.q);

  FOR r IN SELECT value FROM jsonb_array_elements(coalesce(v_list, '[]'::jsonb)) LOOP
    IF (r->>'n')::int = 0 THEN
      RAISE EXCEPTION 'BILAN_SYNC_SUPPRESSION_LIEE: question % liée, suppression refusée', r->>'qid';
    END IF;
    IF p_expected_updated_at IS NULL OR v_row.updated_at > (p_expected_updated_at + interval '1 millisecond') THEN
      RAISE EXCEPTION 'BILAN_SYNC_CONFLIT: question % modifiee depuis la derniere ouverture', r->>'qid';
    END IF;
    PERFORM public.bilan_sync_enregistrer((r->>'id')::uuid, v_side, r->'cli_q', public.bilan_sync_empreinte(r->'db_q'), 'editeur_admin');
    v_changed := v_changed + 1;
  END LOOP;

  SELECT module_data INTO v_cur FROM public.module_editor_state WHERE module_id = p_module_id;
  IF jsonb_typeof(v_data->'exercices') = 'array' THEN
    WITH l AS (
      SELECT DISTINCT
        (CASE WHEN v_side = 'vtc' THEN vtc_exercice_id ELSE taxi_exercice_id END)::text AS ex,
        (CASE WHEN v_side = 'vtc' THEN vtc_question_id ELSE taxi_question_id END)::text AS qid
      FROM public.bilan_sync_liens WHERE statut = 'liee'
    ), cur AS (
      SELECT DISTINCT ON (x->>'id', q->>'id') x->>'id' AS ex, q->>'id' AS qid, q
      FROM jsonb_array_elements(public.jsonb_as_array(v_cur->'exercices')) WITH ORDINALITY e(x, eo),
           jsonb_array_elements(public.jsonb_as_array(x->'questions')) WITH ORDINALITY qq(q, qo)
      WHERE x->>'id' IS NOT NULL AND q->>'id' IS NOT NULL
      ORDER BY x->>'id', q->>'id', eo, qo
    ), rep AS (
      SELECT cur.ex, cur.qid, cur.q FROM l JOIN cur ON cur.ex = l.ex AND cur.qid = l.qid
    ), exo AS (
      SELECT x, eo, x->>'id' AS exid, min(eo) OVER (PARTITION BY x->>'id') AS first_eo
      FROM jsonb_array_elements(v_data->'exercices') WITH ORDINALITY e(x, eo)
    ), touched AS (
      SELECT exo.eo,
        (SELECT jsonb_agg(CASE WHEN qq.qo = qq.first_qo THEN coalesce(rp.q, qq.q) ELSE qq.q END ORDER BY qq.qo)
         FROM (SELECT q, qo, q->>'id' AS qid, min(qo) OVER (PARTITION BY q->>'id') AS first_qo
               FROM jsonb_array_elements(exo.x->'questions') WITH ORDINALITY z(q, qo)) qq
         LEFT JOIN rep rp ON rp.ex = exo.exid AND rp.qid = qq.qid) AS questions
      FROM exo
      WHERE exo.eo = exo.first_eo
        AND jsonb_typeof(exo.x->'questions') = 'array'
        AND EXISTS (
          SELECT 1 FROM rep rp, jsonb_array_elements(exo.x->'questions') z(q)
          WHERE rp.ex = exo.exid AND rp.qid = z.q->>'id')
    )
    SELECT jsonb_agg(CASE WHEN t.eo IS NOT NULL THEN jsonb_set(exo.x, '{questions}', t.questions) ELSE exo.x END ORDER BY exo.eo),
           count(t.eo)
    INTO v_rep, v_touched
    FROM exo LEFT JOIN touched t ON t.eo = exo.eo;
    IF v_touched > 0 THEN
      v_data := jsonb_set(v_data, '{exercices}', v_rep);
    END IF;
  END IF;

  RETURN jsonb_build_object('module_data', v_data, 'synchronisees', v_changed);
END $function$;