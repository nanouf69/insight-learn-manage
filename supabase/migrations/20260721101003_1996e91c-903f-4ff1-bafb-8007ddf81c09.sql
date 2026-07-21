
UPDATE module_editor_state mes
SET module_data = jsonb_set(
  module_data,
  '{exercices}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN exo->'questions' IS NULL THEN exo
        ELSE jsonb_set(exo, '{questions}', (
          SELECT jsonb_agg(
            CASE 
              WHEN q->>'enonce' = 'Quelles sanctions administratives risque-t-on pour non-respect de la réglementation T3P ?'
              THEN jsonb_set(q, '{choix}', (
                SELECT jsonb_agg(
                  CASE WHEN c->>'lettre' = 'C' THEN jsonb_set(c, '{correct}', 'true'::jsonb) ELSE c END
                )
                FROM jsonb_array_elements(q->'choix') c
              ))
              ELSE q
            END
          )
          FROM jsonb_array_elements(exo->'questions') q
        ))
      END
    )
    FROM jsonb_array_elements(module_data->'exercices') exo
  )
),
updated_at = now()
WHERE module_id IN (25, 39);
