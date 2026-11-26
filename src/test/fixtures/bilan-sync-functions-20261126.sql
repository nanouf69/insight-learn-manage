CREATE OR REPLACE FUNCTION public.bilan_sync_champs()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT ARRAY['enonce','choix','image','imageSize','explication','bareme','points','reponseQRC','reponsesAttendues']::text[];
$function$;

CREATE OR REPLACE FUNCTION public.bilan_sync_mapping()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT '[
    {"src_module": 2, "dst_module": 4, "blocs": [
      {"bloc": "100", "sources": ["1","2"]},
      {"bloc": "101", "sources": ["60","61","62"]},
      {"bloc": "102", "sources": ["80","81","82"]},
      {"bloc": "103", "sources": ["50"]},
      {"bloc": "104", "sources": ["7"]},
      {"bloc": "105", "sources": ["3","4","5","6"]},
      {"bloc": "106", "sources": ["72"]}
    ]},
    {"src_module": 10, "dst_module": 9, "blocs": [
      {"bloc": "100", "sources": ["1","2"]},
      {"bloc": "101", "sources": ["60","61","62"]},
      {"bloc": "102", "sources": ["80","81","82"]},
      {"bloc": "103", "sources": ["50"]},
      {"bloc": "105", "sources": ["3","4","5","6"]},
      {"bloc": "203", "sources": ["70","71"]},
      {"bloc": "204", "sources": ["73","74","75","76"]}
    ]}
  ]'::jsonb;
$function$;

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

CREATE OR REPLACE FUNCTION public.bilan_sync_empreinte(q jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT md5(public.bilan_sync_payload(q)::text);
$function$;

CREATE OR REPLACE FUNCTION public.bilan_sync_enregistrer(p_lien_id uuid, p_cote_source text, p_question jsonb, p_empreinte_attendue text, p_motif text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  l public.bilan_sync_liens%ROWTYPE;
  v_fields text[] := public.bilan_sync_champs();
  v_sens text; v_src_mod int; v_dst_mod int; v_src_ex int; v_dst_ex int; v_src_qid int; v_dst_qid int;
  v_src_ref text; v_dst_ref text;
  v_src_data jsonb; v_dst_data jsonb; v_src_after jsonb; v_dst_after jsonb;
  si int; sj int; di int; dj int; n int;
  v_src_q jsonb; v_dst_q jsonb; v_payload jsonb;
  fp_src_old text; fp_dst_old text; fp_new text;
  v_new_src_q jsonb; v_new_dst_q jsonb;
  v_src_path text[]; v_dst_path text[];
  v_prev_shared text;
  v_now text := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  IF NOT (coalesce(public.has_role(auth.uid(), 'admin'), false)
          OR coalesce(auth.role(), '') = 'service_role'
          OR session_user IN ('postgres', 'supabase_admin')) THEN
    RAISE EXCEPTION 'BILAN_SYNC_ACCES_REFUSE';
  END IF;
  IF coalesce(current_setting('app.bilan_sync_en_cours', true), '0') = '1' THEN
    RAISE EXCEPTION 'BILAN_SYNC_BOUCLE_INTERDITE';
  END IF;
  PERFORM set_config('app.bilan_sync_en_cours', '1', true);
  -- aucune propagation "quiz partagés" vers d'autres modules pendant la synchronisation
  v_prev_shared := coalesce(current_setting('app.shared_exercice_sync', true), '');
  PERFORM set_config('app.shared_exercice_sync', '1', true);

  IF p_cote_source NOT IN ('vtc', 'taxi') THEN RAISE EXCEPTION 'BILAN_SYNC_SENS_INVALIDE'; END IF;

  SELECT * INTO l FROM public.bilan_sync_liens WHERE id = p_lien_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BILAN_SYNC_LIEN_INCONNU'; END IF;
  IF l.statut <> 'liee' THEN RAISE EXCEPTION 'BILAN_SYNC_LIEN_NON_ACTIF (%)', l.statut; END IF;
  IF l.vtc_module_id <> 5 OR l.taxi_module_id <> 11 THEN RAISE EXCEPTION 'BILAN_SYNC_HORS_PERIMETRE'; END IF;
  IF (l.matiere_key, l.vtc_exercice_id, l.taxi_exercice_id) NOT IN (
       ('bilan_t3p',500,600),('bilan_gestion',501,601),('bilan_securite',502,602),
       ('bilan_francais',503,603),('bilan_anglais',504,604)) THEN
    RAISE EXCEPTION 'BILAN_SYNC_HORS_PERIMETRE';
  END IF;
  IF l.empreinte_vtc_ref IS NULL OR l.empreinte_taxi_ref IS NULL THEN
    RAISE EXCEPTION 'BILAN_SYNC_REFERENCE_ABSENTE';
  END IF;

  IF p_cote_source = 'vtc' THEN
    v_sens := 'vtc_vers_taxi'; v_src_mod := 5; v_dst_mod := 11;
    v_src_ex := l.vtc_exercice_id; v_dst_ex := l.taxi_exercice_id;
    v_src_qid := l.vtc_question_id; v_dst_qid := l.taxi_question_id;
    v_src_ref := l.empreinte_vtc_ref; v_dst_ref := l.empreinte_taxi_ref;
  ELSE
    v_sens := 'taxi_vers_vtc'; v_src_mod := 11; v_dst_mod := 5;
    v_src_ex := l.taxi_exercice_id; v_dst_ex := l.vtc_exercice_id;
    v_src_qid := l.taxi_question_id; v_dst_qid := l.vtc_question_id;
    v_src_ref := l.empreinte_taxi_ref; v_dst_ref := l.empreinte_vtc_ref;
  END IF;

  IF p_question IS NULL OR jsonb_typeof(p_question) <> 'object'
     OR (p_question->>'id') IS DISTINCT FROM v_src_qid::text THEN
    RAISE EXCEPTION 'BILAN_SYNC_QUESTION_DIFFERENTE';
  END IF;

  PERFORM 1 FROM public.module_editor_state WHERE module_id IN (5, 11) ORDER BY module_id FOR UPDATE;
  SELECT count(*) INTO n FROM public.module_editor_state WHERE module_id IN (5, 11);
  IF n <> 2 THEN RAISE EXCEPTION 'BILAN_SYNC_MODULES_INCOHERENTS'; END IF;
  SELECT module_data INTO v_src_data FROM public.module_editor_state WHERE module_id = v_src_mod;
  SELECT module_data INTO v_dst_data FROM public.module_editor_state WHERE module_id = v_dst_mod;

  SELECT count(*), min(o - 1) INTO n, si FROM jsonb_array_elements(public.jsonb_as_array(v_src_data->'exercices')) WITH ORDINALITY e(x, o) WHERE x->>'id' = v_src_ex::text;
  IF n <> 1 THEN RAISE EXCEPTION 'BILAN_SYNC_MATIERE_SOURCE_INTROUVABLE'; END IF;
  SELECT count(*), min(o - 1) INTO n, di FROM jsonb_array_elements(public.jsonb_as_array(v_dst_data->'exercices')) WITH ORDINALITY e(x, o) WHERE x->>'id' = v_dst_ex::text;
  IF n <> 1 THEN RAISE EXCEPTION 'BILAN_SYNC_MATIERE_CIBLE_INTROUVABLE'; END IF;
  SELECT count(*), min(o - 1) INTO n, sj FROM jsonb_array_elements(public.jsonb_as_array(v_src_data->'exercices'->si->'questions')) WITH ORDINALITY q(x, o) WHERE x->>'id' = v_src_qid::text;
  IF n <> 1 THEN RAISE EXCEPTION 'BILAN_SYNC_QUESTION_SOURCE_INTROUVABLE'; END IF;
  SELECT count(*), min(o - 1) INTO n, dj FROM jsonb_array_elements(public.jsonb_as_array(v_dst_data->'exercices'->di->'questions')) WITH ORDINALITY q(x, o) WHERE x->>'id' = v_dst_qid::text;
  IF n <> 1 THEN RAISE EXCEPTION 'BILAN_SYNC_QUESTION_CIBLE_INTROUVABLE'; END IF;

  v_src_path := ARRAY['exercices', si::text, 'questions', sj::text];
  v_dst_path := ARRAY['exercices', di::text, 'questions', dj::text];
  v_src_q := v_src_data #> v_src_path;
  v_dst_q := v_dst_data #> v_dst_path;
  fp_src_old := public.bilan_sync_empreinte(v_src_q);
  fp_dst_old := public.bilan_sync_empreinte(v_dst_q);

  IF p_empreinte_attendue IS DISTINCT FROM fp_src_old THEN RAISE EXCEPTION 'BILAN_SYNC_VERSION_PERIMEE'; END IF;
  IF fp_src_old <> v_src_ref THEN RAISE EXCEPTION 'BILAN_SYNC_CONFLIT: source modifiee hors synchronisation'; END IF;
  IF fp_dst_old <> v_dst_ref THEN RAISE EXCEPTION 'BILAN_SYNC_CONFLIT: cible modifiee separement'; END IF;

  v_payload := public.bilan_sync_payload(p_question);
  IF NOT v_payload ? 'enonce' THEN RAISE EXCEPTION 'BILAN_SYNC_ENONCE_OBLIGATOIRE'; END IF;
  IF md5(v_payload::text) = fp_src_old AND fp_src_old = fp_dst_old THEN
    PERFORM set_config('app.shared_exercice_sync', v_prev_shared, true);
    PERFORM set_config('app.bilan_sync_en_cours', '0', true);
    RETURN jsonb_build_object('statut', 'aucun_changement', 'lien_id', l.id);
  END IF;

  v_new_src_q := (v_src_q - v_fields) || v_payload || jsonb_build_object('_editedAt', v_now, 'manually_edited', true);
  v_new_dst_q := (v_dst_q - v_fields) || v_payload || jsonb_build_object('_editedAt', v_now, 'manually_edited', true);
  fp_new := public.bilan_sync_empreinte(v_new_src_q);

  UPDATE public.module_editor_state SET module_data = jsonb_set(module_data, v_src_path, v_new_src_q), updated_at = now() WHERE module_id = v_src_mod;
  UPDATE public.module_editor_state SET module_data = jsonb_set(module_data, v_dst_path, v_new_dst_q), updated_at = now() WHERE module_id = v_dst_mod;

  -- Contrôles après écriture : seule la question liée a changé, rien d'autre (ni ordre, ni nombre, ni autre question)
  SELECT module_data INTO v_src_after FROM public.module_editor_state WHERE module_id = v_src_mod;
  SELECT module_data INTO v_dst_after FROM public.module_editor_state WHERE module_id = v_dst_mod;
  IF (v_src_after #- v_src_path) IS DISTINCT FROM (v_src_data #- v_src_path)
     OR (v_dst_after #- v_dst_path) IS DISTINCT FROM (v_dst_data #- v_dst_path) THEN
    RAISE EXCEPTION 'BILAN_SYNC_CONTROLE_APRES: contenu hors question modifie';
  END IF;
  IF public.bilan_sync_empreinte(v_src_after #> v_src_path) <> fp_new
     OR public.bilan_sync_empreinte(v_dst_after #> v_dst_path) <> fp_new
     OR (v_src_after #> v_src_path)->>'id' <> v_src_qid::text
     OR (v_dst_after #> v_dst_path)->>'id' <> v_dst_qid::text THEN
    RAISE EXCEPTION 'BILAN_SYNC_CONTROLE_APRES: question non alignee';
  END IF;

  UPDATE public.bilan_sync_liens SET empreinte_vtc_ref = fp_new, empreinte_taxi_ref = fp_new WHERE id = l.id;

  INSERT INTO public.bilan_sync_journal (lien_id, evenement, sens, source_module_id, cible_module_id, question_id,
    avant, apres, empreinte_avant, empreinte_apres, auteur, motif)
  VALUES (l.id, 'synchronisation', v_sens, v_src_mod, v_dst_mod, v_src_qid,
    jsonb_build_object('source', v_src_q, 'cible', v_dst_q),
    jsonb_build_object('source', v_new_src_q, 'cible', v_new_dst_q),
    fp_src_old || '|' || fp_dst_old, fp_new, auth.uid(), p_motif);

  PERFORM set_config('app.shared_exercice_sync', v_prev_shared, true);
  PERFORM set_config('app.bilan_sync_en_cours', '0', true);
  RETURN jsonb_build_object('statut', 'synchronise', 'lien_id', l.id, 'sens', v_sens, 'empreinte', fp_new);
END $function$;

CREATE OR REPLACE FUNCTION public.bilan_sync_payload(q jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT coalesce(jsonb_object_agg(k, q->k), '{}'::jsonb)
  FROM unnest(public.bilan_sync_champs()) k
  WHERE q ? k AND jsonb_typeof(q->k) <> 'null' AND q->k <> '""'::jsonb;
$function$;