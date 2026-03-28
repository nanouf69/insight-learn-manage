UPDATE module_editor_state 
SET module_data = jsonb_set(
  module_data,
  '{matieres}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN mat->>'id' = 't3p' THEN
          jsonb_set(
            mat,
            '{questions}',
            (
              SELECT jsonb_agg(
                CASE 
                  WHEN (q->>'id')::int = 8 AND q->>'enonce' LIKE '%RÉGLEMENTATION DU T3P%' THEN
                    jsonb_set(
                      q,
                      '{choix}',
                      '[{"lettre":"A","texte":"Code des transports","correct":true},{"lettre":"B","texte":"Code préfectoral"},{"lettre":"C","texte":"Code pénal"},{"lettre":"D","texte":"Code du travail"}]'::jsonb
                    )
                  ELSE q
                END
              )
              FROM jsonb_array_elements(mat->'questions') as q
            )
          )
        ELSE mat
      END
    )
    FROM jsonb_array_elements(module_data->'matieres') as mat
  )
)
WHERE module_id = 90011;