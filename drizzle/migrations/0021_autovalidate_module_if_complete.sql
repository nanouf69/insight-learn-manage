CREATE OR REPLACE FUNCTION public.autovalidate_module_if_complete(
  _apprenant_id uuid,
  _module_id integer,
  _total_questions integer
)
RETURNS TABLE(answered integer, total integer, validated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answered integer := 0;
  v_done boolean := false;
  v_row public.apprenant_module_completion%ROWTYPE;
BEGIN
  IF _apprenant_id IS NULL OR _module_id IS NULL OR _total_questions IS NULL OR _total_questions <= 0 THEN
    RETURN QUERY SELECT 0, coalesce(_total_questions, 0), false;
    RETURN;
  END IF;

  -- Compte les réponses RÉELLEMENT enregistrées (clés techniques ignorées,
  -- chaînes vides ou blanches ignorées, tableaux vides ignorés).
  SELECT count(DISTINCT kv.key)::int INTO v_answered
  FROM public.reponses_apprenants r
  CROSS JOIN LATERAL jsonb_each(coalesce(r.reponses, '{}'::jsonb)) kv
  WHERE r.apprenant_id = _apprenant_id
    AND r.exercice_id LIKE 'module_' || _module_id::text || '_exo_%'
    AND left(kv.key, 1) <> '_'
    AND (
      (jsonb_typeof(kv.value) = 'string' AND btrim(kv.value #>> '{}') <> '')
      OR (jsonb_typeof(kv.value) = 'array' AND jsonb_array_length(kv.value) > 0)
      OR (jsonb_typeof(kv.value) IN ('number', 'boolean'))
    );

  IF v_answered < _total_questions THEN
    RETURN QUERY SELECT coalesce(v_answered, 0), _total_questions, false;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.apprenant_module_completion
  WHERE apprenant_id = _apprenant_id AND module_id = _module_id;

  IF v_row.id IS NOT NULL AND (v_row.status = 'completed' OR v_row.completed_at IS NOT NULL) THEN
    RETURN QUERY SELECT v_answered, _total_questions, true;
    RETURN;
  END IF;

  -- Validation forcée : passe par la RPC atomique existante, qui ne dégrade
  -- jamais un module déjà validé et ne touche à aucune réponse.
  PERFORM public.save_module_completion(
    _apprenant_id,
    _module_id,
    true,
    100,
    v_row.score_obtenu,
    v_row.score_max,
    v_row.details
  );
  v_done := true;

  RETURN QUERY SELECT v_answered, _total_questions, v_done;
END;
$$;

GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete(uuid, integer, integer) TO authenticated, service_role;