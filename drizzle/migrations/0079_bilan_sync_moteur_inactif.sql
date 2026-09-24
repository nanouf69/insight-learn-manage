ALTER TABLE public.bilan_sync_liens ADD COLUMN IF NOT EXISTS empreinte_vtc_ref text;
ALTER TABLE public.bilan_sync_liens ADD COLUMN IF NOT EXISTS empreinte_taxi_ref text;
COMMENT ON COLUMN public.bilan_sync_liens.empreinte_vtc_ref IS 'Empreinte des champs synchronisés côté Bilan Examen VTC au dernier alignement (détection de conflit). Renseignée seulement à l''activation.';
COMMENT ON COLUMN public.bilan_sync_liens.empreinte_taxi_ref IS 'Empreinte des champs synchronisés côté Bilan Examen TAXI au dernier alignement (détection de conflit). Renseignée seulement à l''activation.';

CREATE OR REPLACE FUNCTION public.bilan_sync_champs()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['enonce','choix','image','imageSize','explication','bareme','points','reponseQRC','reponsesAttendues']::text[];
$$;

CREATE OR REPLACE FUNCTION public.bilan_sync_payload(q jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_object_agg(k, q->k), '{}'::jsonb)
  FROM unnest(public.bilan_sync_champs()) k
  WHERE q ? k AND jsonb_typeof(q->k) <> 'null' AND q->k <> '""'::jsonb;
$$;

CREATE OR REPLACE FUNCTION public.bilan_sync_empreinte(q jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT md5(public.bilan_sync_payload(q)::text);
$$;

-- Moteur de synchronisation Bilan Examen VTC (module 5) <-> Bilan Examen TAXI (module 11).
-- Appel EXPLICITE uniquement (aucun déclencheur ne l'appelle). Ne fonctionne que sur un lien 'liee'.
CREATE OR REPLACE FUNCTION public.bilan_sync_enregistrer(
  p_lien_id uuid, p_cote_source text, p_question jsonb, p_empreinte_attendue text, p_motif text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  RETURN jsonb_build_object('statut', 'synchronise', 'lien_id', l.id, 'sens', v_sens, 'empreinte', fp_new);
END $$;

REVOKE ALL ON FUNCTION public.bilan_sync_enregistrer(uuid, text, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bilan_sync_enregistrer(uuid, text, jsonb, text, text) TO authenticated, service_role;