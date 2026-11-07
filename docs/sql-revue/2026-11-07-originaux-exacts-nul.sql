-- BROUILLON REVU — NON APPLIQUÉ. Remplace 2026-11-07-transport-marque-non-actif.sql.
-- Conservation exacte des réponses contenant U+0000 (refus 22P05) — strictement ADDITIF :
--   * deux colonnes nullable/à défaut constant (métadonnées seules, aucune réécriture de table) ;
--   * une NOUVELLE fonction persist_answer_batch_v3 ; persist_answer_batch_v2 reste inchangée ;
--   * aucune ligne existante touchée, aucun backfill, aucune donnée ancienne décodée.
-- La fonction serveur upsert-reponse-apprenant n'appelle v3 QUE pour un lot contenant U+0000 ;
-- tout autre lot continue d'utiliser v2 à l'identique.
-- Retour arrière : redéployer la fonction serveur précédente (v3 n'est plus appelée), puis
-- éventuellement REVOKE EXECUTE sur v3. Ne jamais supprimer les colonnes : elles peuvent
-- contenir les seuls originaux exacts.

ALTER TABLE public.reponses_apprenants
  ADD COLUMN IF NOT EXISTS originaux_exacts jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.reponses_apprenants.originaux_exacts IS
  'Par question : {v:"nul-b64-v1", b64, projection}. Original exact (UTF-8 JSON base64) d''une valeur contenant U+0000 ; valide seulement si projection = reponses->question.';
ALTER TABLE public.reponses_apprenants_journal
  ADD COLUMN IF NOT EXISTS valeur_originale jsonb DEFAULT NULL;
COMMENT ON COLUMN public.reponses_apprenants_journal.valeur_originale IS
  'Marqueur {v:"nul-b64-v1", b64, projection} lorsque la saisie contenait U+0000 ; NULL sinon.';

CREATE OR REPLACE FUNCTION public.persist_answer_batch_v3(p_apprenant_id uuid, p_user_id uuid, p_module_id integer, p_exercice_id text, p_exercice_type text, p_reponses jsonb, p_completed boolean, p_score numeric, p_base_seq bigint, p_events jsonb, p_originaux jsonb)
 RETURNS TABLE(saved boolean, stored_reponses jsonb, stored_originaux jsonb, stored_tentative integer, stored_updated_at timestamp with time zone, stored_write_seq bigint, frozen boolean, skipped_questions text[], accepted_event_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_current public.reponses_apprenants%ROWTYPE;
  v_tentative integer := 1;
  v_accepted uuid[] := ARRAY[]::uuid[];
  v_skipped text[] := ARRAY[]::text[];
  v_event jsonb;
  v_event_id uuid;
  v_base bigint := GREATEST(COALESCE(p_base_seq, 0), 0);
  v_next_seq bigint;
  v_merged jsonb;
  v_meta jsonb;
  v_orig jsonb;
  v_key text;
  v_value jsonb;
  v_marker jsonb;
  v_stored_seq bigint;
  v_frozen boolean := false;
  v_applied boolean := false;
BEGIN
  -- Contrat du marqueur : version connue, projection = valeur envoyée, sinon refus (aucun stockage partiel).
  FOR v_key, v_marker IN SELECT key, value FROM jsonb_each(COALESCE(p_originaux, '{}'::jsonb)) LOOP
    IF jsonb_typeof(v_marker) <> 'object' OR v_marker->>'v' IS DISTINCT FROM 'nul-b64-v1'
       OR COALESCE(v_marker->>'b64', '') !~ '^[A-Za-z0-9+/]+={0,2}$'
       OR NOT (COALESCE(p_reponses, '{}'::jsonb) ? v_key)
       OR (v_marker->'projection') IS DISTINCT FROM (p_reponses->v_key) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0550', MESSAGE = format('ORIGINAL_MARQUEUR_INVALIDE question %s', v_key);
    END IF;
  END LOOP;

  SELECT * INTO v_current FROM public.reponses_apprenants
  WHERE apprenant_id = p_apprenant_id AND exercice_id = p_exercice_id
  FOR UPDATE;

  IF FOUND THEN
    v_tentative := COALESCE(v_current.tentative, 1);
    IF v_current.status = 'submitted' OR v_current.completed = true THEN
      v_frozen := true;
    ELSE
      v_next_seq := COALESCE(v_current.write_seq, 0) + 1;
      v_merged := COALESCE(v_current.reponses, '{}'::jsonb);
      v_meta := COALESCE(v_current.reponses_meta, '{}'::jsonb);
      v_orig := COALESCE(v_current.originaux_exacts, '{}'::jsonb);
      FOR v_key, v_value IN SELECT key, value FROM jsonb_each(COALESCE(p_reponses, '{}'::jsonb)) LOOP
        v_stored_seq := NULLIF(v_meta -> v_key ->> 'seq', '')::bigint;
        IF v_stored_seq IS NULL OR v_stored_seq <= v_base THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_value, true);
          v_meta := jsonb_set(v_meta, ARRAY[v_key], jsonb_build_object('seq', v_next_seq, 'at', to_jsonb(now())), true);
          -- Le marqueur suit EXACTEMENT la valeur écrite : posé si fourni, retiré sinon.
          IF COALESCE(p_originaux, '{}'::jsonb) ? v_key THEN
            v_orig := jsonb_set(v_orig, ARRAY[v_key], p_originaux->v_key, true);
          ELSE
            v_orig := v_orig - v_key;
          END IF;
          v_applied := true;
        ELSE
          v_skipped := array_append(v_skipped, v_key);
        END IF;
      END LOOP;

      IF v_applied OR COALESCE(p_completed, false) OR p_score IS NOT NULL THEN
        UPDATE public.reponses_apprenants
        SET user_id = COALESCE(p_user_id, user_id),
            exercice_type = p_exercice_type,
            reponses = v_merged,
            reponses_meta = v_meta,
            originaux_exacts = v_orig,
            write_seq = v_next_seq,
            completed = v_current.completed OR COALESCE(p_completed, false),
            score = CASE WHEN p_score IS NULL THEN v_current.score ELSE p_score END,
            updated_at = now()
        WHERE id = v_current.id
        RETURNING * INTO v_current;
      END IF;
    END IF;
  ELSE
    v_merged := COALESCE(p_reponses, '{}'::jsonb);
    v_meta := '{}'::jsonb;
    FOR v_key IN SELECT key FROM jsonb_each(v_merged) LOOP
      v_meta := jsonb_set(v_meta, ARRAY[v_key], jsonb_build_object('seq', 1, 'at', to_jsonb(now())), true);
    END LOOP;
    INSERT INTO public.reponses_apprenants (
      apprenant_id, user_id, exercice_id, exercice_type, reponses,
      reponses_meta, originaux_exacts, write_seq, completed, score, updated_at
    ) VALUES (
      p_apprenant_id, p_user_id, p_exercice_id, p_exercice_type,
      v_merged, v_meta, COALESCE(p_originaux, '{}'::jsonb), 1, COALESCE(p_completed, false), p_score, now()
    )
    RETURNING * INTO v_current;
    v_tentative := COALESCE(v_current.tentative, 1);
  END IF;

  IF jsonb_typeof(COALESCE(p_events, '[]'::jsonb)) = 'array' THEN
    FOR v_event IN SELECT value FROM jsonb_array_elements(COALESCE(p_events, '[]'::jsonb)) LOOP
      IF NULLIF(v_event->>'question_id', '') IS NULL THEN CONTINUE; END IF;
      IF v_event ? 'valeur_originale' AND (
           jsonb_typeof(v_event->'valeur_originale') <> 'object'
           OR v_event->'valeur_originale'->>'v' IS DISTINCT FROM 'nul-b64-v1'
           OR (v_event->'valeur_originale'->'projection') IS DISTINCT FROM COALESCE(v_event->'valeur', 'null'::jsonb)) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0550', MESSAGE = 'ORIGINAL_MARQUEUR_INVALIDE evenement';
      END IF;
      BEGIN
        v_event_id := COALESCE(NULLIF(v_event->>'event_id', '')::uuid, gen_random_uuid());
      EXCEPTION WHEN invalid_text_representation THEN
        v_event_id := gen_random_uuid();
      END;
      INSERT INTO public.reponses_apprenants_journal (
        event_id, apprenant_id, user_id, module_id, exercice_id,
        exercice_type, question_id, valeur, valeur_originale, tentative, client_saved_at
      ) VALUES (
        v_event_id, p_apprenant_id, p_user_id, p_module_id, p_exercice_id,
        p_exercice_type, v_event->>'question_id', COALESCE(v_event->'valeur', 'null'::jsonb),
        v_event->'valeur_originale',
        COALESCE(NULLIF(v_event->>'tentative', '')::integer, v_tentative),
        NULLIF(v_event->>'client_saved_at', '')::timestamptz
      )
      ON CONFLICT (event_id) DO NOTHING;
      v_accepted := array_append(v_accepted, v_event_id);
    END LOOP;
  END IF;

  RETURN QUERY SELECT true, v_current.reponses, COALESCE(v_current.originaux_exacts, '{}'::jsonb),
    COALESCE(v_current.tentative, v_tentative), v_current.updated_at,
    COALESCE(v_current.write_seq, 0), v_frozen, v_skipped, v_accepted;
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_answer_batch_v3(uuid, uuid, integer, text, text, jsonb, boolean, numeric, bigint, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_answer_batch_v3(uuid, uuid, integer, text, text, jsonb, boolean, numeric, bigint, jsonb, jsonb) TO service_role;
