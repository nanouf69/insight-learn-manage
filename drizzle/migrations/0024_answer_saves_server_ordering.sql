-- Ordonnancement des écritures de réponses décidé par le SERVEUR (plus par
-- l'horloge de l'appareil de l'apprenant).
--
-- Principe : chaque écriture acceptée incrémente un compteur serveur
-- (write_seq) et marque, question par question, le numéro d'écriture qui l'a
-- produite (reponses_meta). Le client renvoie le dernier numéro d'écriture
-- qu'il connaissait (p_base_seq) : une réponse hors connexion, composée avant
-- une écriture plus récente, ne peut plus écraser cette écriture plus récente.
--
-- Aucune donnée existante n'est modifiée : les colonnes sont additives et les
-- réponses déjà enregistrées (sans métadonnée) restent modifiables comme avant.

ALTER TABLE public.reponses_apprenants
  ADD COLUMN IF NOT EXISTS reponses_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reponses_apprenants
  ADD COLUMN IF NOT EXISTS write_seq bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.persist_answer_batch_v2(
  p_apprenant_id uuid,
  p_user_id uuid,
  p_module_id integer,
  p_exercice_id text,
  p_exercice_type text,
  p_reponses jsonb,
  p_completed boolean,
  p_score numeric,
  p_base_seq bigint,
  p_events jsonb
)
RETURNS TABLE(
  saved boolean,
  stored_reponses jsonb,
  stored_tentative integer,
  stored_updated_at timestamptz,
  stored_write_seq bigint,
  frozen boolean,
  skipped_questions text[],
  accepted_event_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_key text;
  v_value jsonb;
  v_stored_seq bigint;
  v_frozen boolean := false;
  v_applied boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM public.reponses_apprenants
  WHERE apprenant_id = p_apprenant_id
    AND exercice_id = p_exercice_id
  FOR UPDATE;

  IF FOUND THEN
    v_tentative := COALESCE(v_current.tentative, 1);

    -- Tentative définitivement terminée : figée. Une réponse restée dans la
    -- file hors connexion ne peut plus la modifier (elle reste journalisée).
    IF v_current.status = 'submitted' OR v_current.completed = true THEN
      v_frozen := true;
    ELSE
      v_next_seq := COALESCE(v_current.write_seq, 0) + 1;
      v_merged := COALESCE(v_current.reponses, '{}'::jsonb);
      v_meta := COALESCE(v_current.reponses_meta, '{}'::jsonb);

      FOR v_key, v_value IN
        SELECT key, value FROM jsonb_each(COALESCE(p_reponses, '{}'::jsonb))
      LOOP
        v_stored_seq := NULLIF(v_meta -> v_key ->> 'seq', '')::bigint;
        IF v_stored_seq IS NULL OR v_stored_seq <= v_base THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_value, true);
          v_meta := jsonb_set(
            v_meta,
            ARRAY[v_key],
            jsonb_build_object('seq', v_next_seq, 'at', to_jsonb(now())),
            true
          );
          v_applied := true;
        ELSE
          -- Une écriture plus récente existe déjà pour cette question :
          -- la valeur ancienne est ignorée (jamais d'écrasement à rebours).
          v_skipped := array_append(v_skipped, v_key);
        END IF;
      END LOOP;

      IF v_applied OR COALESCE(p_completed, false) OR p_score IS NOT NULL THEN
        UPDATE public.reponses_apprenants
        SET user_id = COALESCE(p_user_id, user_id),
            exercice_type = p_exercice_type,
            reponses = v_merged,
            reponses_meta = v_meta,
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
    FOR v_key IN SELECT key FROM jsonb_each(v_merged)
    LOOP
      v_meta := jsonb_set(
        v_meta, ARRAY[v_key],
        jsonb_build_object('seq', 1, 'at', to_jsonb(now())), true
      );
    END LOOP;

    INSERT INTO public.reponses_apprenants (
      apprenant_id, user_id, exercice_id, exercice_type, reponses,
      reponses_meta, write_seq, completed, score, updated_at
    ) VALUES (
      p_apprenant_id, p_user_id, p_exercice_id, p_exercice_type,
      v_merged, v_meta, 1, COALESCE(p_completed, false), p_score, now()
    )
    RETURNING * INTO v_current;
    v_tentative := COALESCE(v_current.tentative, 1);
  END IF;

  -- Journal append-only : toujours alimenté, y compris pour une écriture
  -- ignorée ou une tentative figée (traçabilité complète).
  IF jsonb_typeof(COALESCE(p_events, '[]'::jsonb)) = 'array' THEN
    FOR v_event IN SELECT value FROM jsonb_array_elements(COALESCE(p_events, '[]'::jsonb))
    LOOP
      IF NULLIF(v_event->>'question_id', '') IS NULL THEN
        CONTINUE;
      END IF;
      BEGIN
        v_event_id := COALESCE(NULLIF(v_event->>'event_id', '')::uuid, gen_random_uuid());
      EXCEPTION WHEN invalid_text_representation THEN
        v_event_id := gen_random_uuid();
      END;

      INSERT INTO public.reponses_apprenants_journal (
        event_id, apprenant_id, user_id, module_id, exercice_id,
        exercice_type, question_id, valeur, tentative, client_saved_at
      ) VALUES (
        v_event_id, p_apprenant_id, p_user_id, p_module_id, p_exercice_id,
        p_exercice_type, v_event->>'question_id', COALESCE(v_event->'valeur', 'null'::jsonb),
        COALESCE(NULLIF(v_event->>'tentative', '')::integer, v_tentative),
        NULLIF(v_event->>'client_saved_at', '')::timestamptz
      )
      ON CONFLICT (event_id) DO NOTHING;

      v_accepted := array_append(v_accepted, v_event_id);
    END LOOP;
  END IF;

  RETURN QUERY SELECT
    true,
    v_current.reponses,
    COALESCE(v_current.tentative, v_tentative),
    v_current.updated_at,
    COALESCE(v_current.write_seq, 0),
    v_frozen,
    v_skipped,
    v_accepted;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_answer_batch_v2(uuid, uuid, integer, text, text, jsonb, boolean, numeric, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_answer_batch_v2(uuid, uuid, integer, text, text, jsonb, boolean, numeric, bigint, jsonb) TO service_role;