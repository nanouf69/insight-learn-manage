
UPDATE module_editor_state
SET module_data = jsonb_set(
  module_data::jsonb,
  '{matieres,0,questions}',
  (
    SELECT jsonb_agg(q)
    FROM jsonb_array_elements(module_data::jsonb->'matieres'->0->'questions') q
    WHERE (q->>'id')::int != 1
  )
)::json,
updated_at = now()
WHERE module_id = 90005;
