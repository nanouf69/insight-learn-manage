UPDATE module_editor_state 
SET module_data = (
  SELECT jsonb_set(
    module_data,
    '{matieres,0,questions}',
    (
      SELECT jsonb_agg(jsonb_set(elem, '{id}', to_jsonb(rn + 1)))
      FROM (
        SELECT elem, row_number() OVER () AS rn
        FROM jsonb_array_elements(module_data->'matieres'->0->'questions') AS elem
      ) sub
    )
  )
  FROM module_editor_state WHERE module_id = 90005
),
updated_at = now()
WHERE module_id = 90005;