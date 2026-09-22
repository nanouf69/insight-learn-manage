-- Note de la matière (= une tentative) calculée UNIQUEMENT à partir du snapshot immuable
-- de la tentative et des données rattachées à cette tentative :
--   points QCM (correction automatique sur le snapshot) + dernière note active de chaque QRC.
-- Aucune lecture de la version actuelle de l'examen. Fonction en lecture seule.
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

    IF coalesce(q->>'type', '') <> 'QRC' THEN
      SELECT array_agg(upper(c->>'lettre') ORDER BY c->>'lettre')
        INTO v_attendues
      FROM jsonb_array_elements(coalesce(q->'choix', '[]'::jsonb)) c
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

GRANT EXECUTE ON FUNCTION public.core_note_attempt(uuid) TO authenticated, service_role;

-- Le recalcul officiel utilise exactement la même formule : Admin et apprenant lisent le même résultat.
CREATE OR REPLACE FUNCTION public.core_recalc_result(p_attempt_id uuid)
RETURNS core_exam_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  att public.exam_attempts_v2;
  n record;
  res public.core_exam_results;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF att IS NULL THEN
    RAISE EXCEPTION 'ATTEMPT_INCONNUE: %', p_attempt_id USING ERRCODE = 'P0475';
  END IF;

  SELECT * INTO n FROM public.core_note_attempt(p_attempt_id);

  INSERT INTO public.core_exam_results (attempt_id, apprenant_id, result_revision, status, score, total, qrc_restantes, published_at)
  VALUES (p_attempt_id, att.apprenant_id, 1,
          CASE WHEN n.qrc_restantes = 0 THEN 'definitif' ELSE 'provisoire' END,
          n.score20, n.total, n.qrc_restantes,
          CASE WHEN n.qrc_restantes = 0 THEN now() ELSE NULL END)
  ON CONFLICT (attempt_id) DO UPDATE SET
    result_revision = public.core_exam_results.result_revision + 1,
    status = EXCLUDED.status,
    score = EXCLUDED.score,
    total = EXCLUDED.total,
    qrc_restantes = EXCLUDED.qrc_restantes,
    published_at = CASE WHEN EXCLUDED.status = 'definitif'
                        THEN coalesce(public.core_exam_results.published_at, now()) ELSE NULL END,
    updated_at = now()
  RETURNING * INTO res;

  RETURN res;
END;
$$;