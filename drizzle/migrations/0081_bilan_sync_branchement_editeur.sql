CREATE OR REPLACE FUNCTION public.bilan_sync_router_editeur(p_module_id integer, p_module_data jsonb, p_expected_updated_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- Branchement de l'éditeur Admin sur le moteur bilan_sync_enregistrer.
-- Retourne NULL si aucune correspondance « liée » ne concerne ce module (comportement inchangé).
-- Sinon : chaque question liée modifiée passe par le moteur (même transaction), puis le
-- module envoyé est reconstruit avec la version serveur de TOUTES les questions liées.
DECLARE
  v_side text; r record; v_cur jsonb; v_row public.module_editor_state%ROWTYPE;
  v_cli_q jsonb; v_db_q jsonb; v_ex int; v_qid int; v_changed int := 0; v_data jsonb := p_module_data;
  ei int; qi int; n int;
BEGIN
  IF p_module_id = 5 THEN v_side := 'vtc'; ELSIF p_module_id = 11 THEN v_side := 'taxi'; ELSE RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bilan_sync_liens WHERE statut = 'liee') THEN RETURN NULL; END IF;

  PERFORM 1 FROM public.module_editor_state WHERE module_id IN (5, 11) ORDER BY module_id FOR UPDATE;
  SELECT * INTO v_row FROM public.module_editor_state WHERE module_id = p_module_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- 1) Détection des questions liées réellement modifiées (contenu synchronisé uniquement)
  FOR r IN SELECT * FROM public.bilan_sync_liens WHERE statut = 'liee' ORDER BY id LOOP
    v_ex := CASE WHEN v_side = 'vtc' THEN r.vtc_exercice_id ELSE r.taxi_exercice_id END;
    v_qid := CASE WHEN v_side = 'vtc' THEN r.vtc_question_id ELSE r.taxi_question_id END;
    SELECT q INTO v_db_q FROM jsonb_array_elements(public.jsonb_as_array(v_row.module_data->'exercices')) e(x),
      jsonb_array_elements(public.jsonb_as_array(x->'questions')) q WHERE x->>'id' = v_ex::text AND q->>'id' = v_qid::text LIMIT 1;
    SELECT count(*) INTO n FROM jsonb_array_elements(public.jsonb_as_array(p_module_data->'exercices')) e(x),
      jsonb_array_elements(public.jsonb_as_array(x->'questions')) q WHERE x->>'id' = v_ex::text AND q->>'id' = v_qid::text;
    IF v_db_q IS NOT NULL AND n = 0 THEN
      RAISE EXCEPTION 'BILAN_SYNC_SUPPRESSION_LIEE: question % liée, suppression refusée', v_qid;
    END IF;
    SELECT q INTO v_cli_q FROM jsonb_array_elements(public.jsonb_as_array(p_module_data->'exercices')) e(x),
      jsonb_array_elements(public.jsonb_as_array(x->'questions')) q WHERE x->>'id' = v_ex::text AND q->>'id' = v_qid::text LIMIT 1;
    IF v_db_q IS NULL OR v_cli_q IS NULL THEN CONTINUE; END IF;
    IF public.bilan_sync_payload(v_cli_q) IS DISTINCT FROM public.bilan_sync_payload(v_db_q) THEN
      IF p_expected_updated_at IS NULL OR v_row.updated_at > (p_expected_updated_at + interval '1 millisecond') THEN
        RAISE EXCEPTION 'BILAN_SYNC_CONFLIT: question % modifiee depuis la derniere ouverture', v_qid;
      END IF;
      PERFORM public.bilan_sync_enregistrer(r.id, v_side, v_cli_q, public.bilan_sync_empreinte(v_db_q), 'editeur_admin');
      v_changed := v_changed + 1;
    END IF;
  END LOOP;

  -- 2) Reconstruction : toutes les questions liées reprennent la version serveur
  SELECT module_data INTO v_cur FROM public.module_editor_state WHERE module_id = p_module_id;
  FOR r IN SELECT * FROM public.bilan_sync_liens WHERE statut = 'liee' LOOP
    v_ex := CASE WHEN v_side = 'vtc' THEN r.vtc_exercice_id ELSE r.taxi_exercice_id END;
    v_qid := CASE WHEN v_side = 'vtc' THEN r.vtc_question_id ELSE r.taxi_question_id END;
    SELECT q INTO v_db_q FROM jsonb_array_elements(public.jsonb_as_array(v_cur->'exercices')) e(x),
      jsonb_array_elements(public.jsonb_as_array(x->'questions')) q WHERE x->>'id' = v_ex::text AND q->>'id' = v_qid::text LIMIT 1;
    IF v_db_q IS NULL THEN CONTINUE; END IF;
    SELECT min(o - 1) INTO ei FROM jsonb_array_elements(public.jsonb_as_array(v_data->'exercices')) WITH ORDINALITY e(x, o) WHERE x->>'id' = v_ex::text;
    IF ei IS NULL THEN CONTINUE; END IF;
    SELECT min(o - 1) INTO qi FROM jsonb_array_elements(public.jsonb_as_array(v_data->'exercices'->ei->'questions')) WITH ORDINALITY q(x, o) WHERE x->>'id' = v_qid::text;
    IF qi IS NULL THEN CONTINUE; END IF;
    v_data := jsonb_set(v_data, ARRAY['exercices', ei::text, 'questions', qi::text], v_db_q);
  END LOOP;

  RETURN jsonb_build_object('module_data', v_data, 'synchronisees', v_changed);
END $function$;

REVOKE ALL ON FUNCTION public.bilan_sync_router_editeur(integer, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_module_editor_state(p_module_id integer, p_module_data jsonb, p_deleted_cours jsonb, p_deleted_exercices jsonb, p_source_fingerprint text, p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_row public.module_editor_state%ROWTYPE;
  v_now timestamptz := now();
  v_route jsonb;
  v_skip_cas boolean := false;
BEGIN
  -- Branchement moteur Bilan Examen VTC(5) <-> TAXI(11) : actif seulement si une correspondance est « liée ».
  IF p_module_id IN (5, 11) THEN
    v_route := public.bilan_sync_router_editeur(p_module_id, p_module_data, p_expected_updated_at);
    IF v_route IS NOT NULL THEN
      p_module_data := v_route->'module_data';
      -- Contrôle de version déjà fait question par question par le routeur/moteur
      IF coalesce((v_route->>'synchronisees')::int, 0) > 0 THEN v_skip_cas := true; END IF;
    END IF;
  END IF;

  SELECT * INTO v_current_row
  FROM public.module_editor_state s
  WHERE s.module_id = p_module_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_current_row.module_data IS NOT DISTINCT FROM p_module_data
       AND v_current_row.deleted_cours IS NOT DISTINCT FROM COALESCE(p_deleted_cours, '[]'::jsonb)
       AND v_current_row.deleted_exercices IS NOT DISTINCT FROM COALESCE(p_deleted_exercices, '[]'::jsonb)
       AND v_current_row.source_fingerprint IS NOT DISTINCT FROM p_source_fingerprint THEN
      RETURN QUERY SELECT v_current_row.updated_at;
      RETURN;
    END IF;

    IF NOT v_skip_cas AND p_expected_updated_at IS NOT NULL
       AND v_current_row.updated_at > (p_expected_updated_at + interval '1 millisecond') THEN
      RAISE EXCEPTION 'stale_module_editor_state_write: module_id=% expected=% actual=%',
        p_module_id, p_expected_updated_at, v_current_row.updated_at
        USING ERRCODE = 'P0409',
              HINT = 'Recharger le module pour récupérer la dernière version avant de réenregistrer.';
    END IF;

    UPDATE public.module_editor_state s
      SET module_data = p_module_data,
          deleted_cours = COALESCE(p_deleted_cours, '[]'::jsonb),
          deleted_exercices = COALESCE(p_deleted_exercices, '[]'::jsonb),
          source_fingerprint = p_source_fingerprint,
          updated_at = v_now
      WHERE s.module_id = p_module_id;
  ELSE
    INSERT INTO public.module_editor_state(
      module_id, module_data, deleted_cours, deleted_exercices,
      source_fingerprint, updated_at
    )
    VALUES (
      p_module_id, p_module_data,
      COALESCE(p_deleted_cours, '[]'::jsonb),
      COALESCE(p_deleted_exercices, '[]'::jsonb),
      p_source_fingerprint, v_now
    );
  END IF;

  RETURN QUERY SELECT v_now;
END;
$function$;