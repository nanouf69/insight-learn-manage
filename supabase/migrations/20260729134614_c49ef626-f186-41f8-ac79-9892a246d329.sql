WITH cur AS (
  SELECT module_data FROM public.module_editor_state WHERE module_id = 8
),
ex1_q AS (
  SELECT q, ord FROM cur, jsonb_array_elements(module_data->'exercices'->0->'questions') WITH ORDINALITY AS t(q, ord)
),
ex2_q AS (
  SELECT q, ord FROM cur, jsonb_array_elements(module_data->'exercices'->1->'questions') WITH ORDINALITY AS t(q, ord)
),
all_q AS (
  SELECT q, ord AS rn FROM ex1_q
  UNION ALL
  SELECT q, (SELECT COUNT(*) FROM ex1_q) + ord FROM ex2_q
),
merged_questions AS (
  SELECT jsonb_agg(jsonb_set(q, '{id}', to_jsonb(rn::int)) ORDER BY rn) AS qs FROM all_q
),
merged_ex AS (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'id', (EXTRACT(EPOCH FROM now())*1000)::bigint,
      'titre', 'Quizz Ville De Lyon',
      'actif', true,
      'questions', (SELECT qs FROM merged_questions)
    )
  ) AS exs
)
UPDATE public.module_editor_state mes
SET module_data = jsonb_set(mes.module_data, '{exercices}', (SELECT exs FROM merged_ex)),
    updated_at = now()
WHERE mes.module_id = 8;