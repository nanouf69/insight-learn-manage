ALTER TABLE public.reponses_apprenants_journal
ADD COLUMN IF NOT EXISTS event_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS uq_reponses_apprenants_journal_event_id
ON public.reponses_apprenants_journal (event_id);

CREATE OR REPLACE FUNCTION public.persist_answer_batch(
  p_apprenant_id uuid,
  p_user_id uuid,
  p_module_id integer,
  p_exercice_id text,
  p_exercice_type text,
  p_reponses jsonb,
  p_completed boolean,
  p_score numeric,
  p_updated_at timestamptz,
  p_events jsonb
)
RETURNS TABLE(
  saved boolean,
  stored_reponses jsonb,
  stored_tentative integer,
  stored_updated_at timestamptz,
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
  v_event jsonb;
  v_event_id uuid;
BEGIN
  SELECT * INTO v_current
  FROM public.reponses_apprenants
  WHERE apprenant_id = p_apprenant_id
    AND exercice_id = p_exercice_id
  FOR UPDATE;

  IF FOUND THEN
    v_tentative := COALESCE(v_current.tentative, 1);

    IF v_current.updated_at IS NULL OR p_updated_at >= v_current.updated_at THEN
      UPDATE public.reponses_apprenants
      SET user_id = p_user_id,
          exercice_type = p_exercice_type,
          reponses = COALESCE(p_reponses, '{}'::jsonb),
          completed = v_current.completed OR COALESCE(p_completed, false),
          score = CASE WHEN p_score IS NULL THEN v_current.score ELSE p_score END,
          updated_at = p_updated_at
      WHERE id = v_current.id
      RETURNING * INTO v_current;
    END IF;
  ELSE
    INSERT INTO public.reponses_apprenants (
      apprenant_id, user_id, exercice_id, exercice_type, reponses,
      completed, score, updated_at
    ) VALUES (
      p_apprenant_id, p_user_id, p_exercice_id, p_exercice_type,
      COALESCE(p_reponses, '{}'::jsonb), COALESCE(p_completed, false),
      p_score, p_updated_at
    )
    RETURNING * INTO v_current;
    v_tentative := COALESCE(v_current.tentative, 1);
  END IF;

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

  RETURN QUERY SELECT true, v_current.reponses, COALESCE(v_current.tentative, v_tentative), v_current.updated_at, v_accepted;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_answer_batch(uuid, uuid, integer, text, text, jsonb, boolean, numeric, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_answer_batch(uuid, uuid, integer, text, text, jsonb, boolean, numeric, timestamptz, jsonb) TO service_role;