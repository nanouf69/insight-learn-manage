CREATE OR REPLACE FUNCTION public.repair_bilan_security_questions_from_payload(_questions jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  IF jsonb_typeof(_questions) <> 'array' OR jsonb_array_length(_questions) <> 211 THEN
    RAISE EXCEPTION 'Invalid Bilan Sécurité payload: expected 211 questions';
  END IF;

  WITH restored AS (
    SELECT jsonb_agg(
      q.value
      || jsonb_build_object('manually_edited', true)
      || jsonb_build_object('_editedAt', to_jsonb(now()))
      || jsonb_build_object('_repairedAt', to_jsonb(now()))
      || jsonb_build_object('_repairReason', 'full_restore_211_from_bilan_questions_securite_static_source')
      ORDER BY (q.value->>'id')::int
    ) AS questions
    FROM jsonb_array_elements(_questions) q(value)
  ), target_rows AS (
    SELECT mes.module_id, exercise_ordinality - 1 AS exercise_index
    FROM public.module_editor_state mes
    CROSS JOIN LATERAL jsonb_array_elements((mes.module_data::jsonb)->'exercices') WITH ORDINALITY AS exercise(exercise_json, exercise_ordinality)
    WHERE mes.module_id IN (4, 9, 81, 82)
      AND (exercise.exercise_json->>'id')::int = 102
  )
  UPDATE public.module_editor_state mes
  SET module_data = jsonb_set(
        mes.module_data::jsonb,
        ARRAY['exercices', target_rows.exercise_index::text, 'questions'],
        restored.questions,
        true
      ),
      updated_at = now()
  FROM target_rows, restored
  WHERE mes.module_id = target_rows.module_id
    AND restored.questions IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  INSERT INTO public.alertes_systeme (type, titre, message, details)
  VALUES (
    'bilan_repair',
    'Restauration complète 211 questions Bilan Sécurité Routière',
    'Restauration complète des 211 questions/réponses Sécurité Routière depuis la source statique propre pour modules 4 et 9 ; les modules FC 81/82 héritent du parent corrigé.',
    jsonb_build_object(
      'modules_corriges', jsonb_build_array(4, 9, 81, 82),
      'exercice', 102,
      'question_count', 211,
      'updated_rows', updated_count,
      'cause', 'resynchronisation depuis module cours source corrompu / merge de réponses dupliquées',
      'repaired_at', now()
    )::text
  );

  RETURN updated_count;
END;
$$;