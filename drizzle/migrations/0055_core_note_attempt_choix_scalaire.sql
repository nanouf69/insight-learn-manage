-- Certains snapshots historiques ne contiennent pas les propositions ('choix' = null) :
-- on ne devine rien, la question rapporte simplement 0 point automatique.
CREATE OR REPLACE FUNCTION public.core_note_attempt(p_attempt_id uuid)
RETURNS TABLE (
  points_qcm numeric,
  points_qrc numeric,
  total numeric,
  score20 numeric,
  qrc_restantes integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  att public.exam_attempts_v2;
  q jsonb;
  v_total numeric := 0;
  v_qcm numeric := 0;
  v_qrc numeric := 0;
  v_rest integer := 0;
  v_reponse text;
  v_choisies text[];
  v_attendues text[];
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id;
  IF att IS NULL THEN
    RAISE EXCEPTION 'ATTEMPT_INCONNUE: %', p_attempt_id USING ERRCODE = 'P0475';
  END IF;

  FOR q IN SELECT value FROM jsonb_array_elements(coalesce(att.snapshot->'questions', '[]'::jsonb)) LOOP
    v_total := v_total + coalesce((q #>> '{points}')::numeric, 0);

    IF coalesce(q->>'type', '') <> 'QRC' AND jsonb_typeof(q->'choix') = 'array' THEN
      SELECT array_agg(upper(c->>'lettre') ORDER BY c->>'lettre')
        INTO v_attendues
      FROM jsonb_array_elements(q->'choix') c
      WHERE (c->>'correct')::boolean IS TRUE;

      SELECT valeur INTO v_reponse
      FROM public.answer_state
      WHERE attempt_id = p_attempt_id AND question_id = q->>'id';

      IF v_attendues IS NOT NULL AND v_reponse IS NOT NULL THEN
        SELECT array_agg(DISTINCT m[1] ORDER BY m[1])
          INTO v_choisies
        FROM regexp_matches(upper(v_reponse), '[A-E]', 'g') AS m;

        IF v_choisies IS NOT NULL AND v_choisies = v_attendues THEN
          v_qcm := v_qcm + coalesce((q #>> '{points}')::numeric, 0);
        END IF;
      END IF;
    END IF;
  END LOOP;

  SELECT coalesce(sum(note), 0), count(*) FILTER (WHERE etat = 'en_attente')
    INTO v_qrc, v_rest
  FROM public.qrc_instances_v2 WHERE attempt_id = p_attempt_id;

  points_qcm := v_qcm;
  points_qrc := v_qrc;
  total := v_total;
  score20 := CASE WHEN v_total > 0 THEN round((v_qcm + v_qrc) / v_total * 20, 2) ELSE NULL END;
  qrc_restantes := v_rest;
  RETURN NEXT;
END;
$$;