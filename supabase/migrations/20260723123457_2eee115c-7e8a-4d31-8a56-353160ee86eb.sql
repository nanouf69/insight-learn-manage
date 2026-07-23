WITH source_state AS (
  SELECT module_data::jsonb AS module_data
  FROM public.module_editor_state
  WHERE module_id = 2
  ORDER BY updated_at DESC
  LIMIT 1
), source_questions AS (
  SELECT
    row_number() OVER (ORDER BY source_exercise_order, source_question_order)::int AS new_id,
    source_question
  FROM source_state
  CROSS JOIN LATERAL jsonb_array_elements(module_data->'exercices') WITH ORDINALITY AS source_exercise(exercise, source_exercise_order)
  CROSS JOIN LATERAL jsonb_array_elements(source_exercise.exercise->'questions') WITH ORDINALITY AS source_question(source_question, source_question_order)
  WHERE (source_exercise.exercise->>'id')::int IN (80, 81, 82)
), rebuilt_security_questions AS (
  SELECT jsonb_agg(
    source_question
    || jsonb_build_object(
      'id', new_id,
      'manually_edited', true,
      '_editedAt', COALESCE(NULLIF(source_question->>'_editedAt', ''), now()::text)
    )
    ORDER BY new_id
  ) AS questions
  FROM source_questions
), target_rows AS (
  SELECT mes.module_id, exercise_ordinality - 1 AS exercise_index
  FROM public.module_editor_state mes
  CROSS JOIN LATERAL jsonb_array_elements((mes.module_data::jsonb)->'exercices') WITH ORDINALITY AS exercise(exercise_json, exercise_ordinality)
  WHERE mes.module_id IN (4, 9, 81, 82)
    AND (exercise.exercise_json->>'id')::int = 102
)
UPDATE public.module_editor_state mes
SET
  module_data = jsonb_set(
    mes.module_data::jsonb,
    ARRAY['exercices', target_rows.exercise_index::text, 'questions'],
    rebuilt_security_questions.questions,
    true
  ),
  updated_at = now()
FROM target_rows, rebuilt_security_questions
WHERE mes.module_id = target_rows.module_id
  AND rebuilt_security_questions.questions IS NOT NULL;