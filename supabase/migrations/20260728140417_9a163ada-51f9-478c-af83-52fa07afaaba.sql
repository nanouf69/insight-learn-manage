
UPDATE public.module_editor_state
SET module_data = jsonb_set(
  module_data,
  '{exercices}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (e->>'id')::int = 102 THEN
          jsonb_set(
            e,
            '{questions}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN (q->>'id')::int = 10 THEN
                    jsonb_set(
                      q || jsonb_build_object('manually_edited', true, '_editedAt', now()),
                      '{choix}',
                      '[
                        {"lettre":"A","texte":"Sortie de zone à stationnement interdit","correct":true},
                        {"lettre":"B","texte":"Arrêt et stationnement interdit","correct":false},
                        {"lettre":"C","texte":"Proximité d''une chaussée rétrécie","correct":false}
                      ]'::jsonb
                    )
                  WHEN (q->>'id')::int = 11 THEN
                    jsonb_set(
                      q || jsonb_build_object('manually_edited', true, '_editedAt', now()),
                      '{choix}',
                      '[
                        {"lettre":"A","texte":"Passage d''animaux sauvages","correct":false},
                        {"lettre":"B","texte":"Endroit fréquenté par les enfants","correct":false},
                        {"lettre":"C","texte":"Chemin obligatoire pour cavaliers","correct":true}
                      ]'::jsonb
                    )
                  ELSE q
                END
                ORDER BY q_ord
              )
              FROM jsonb_array_elements(e->'questions') WITH ORDINALITY AS qq(q, q_ord)
            )
          )
        ELSE e
      END
      ORDER BY e_ord
    )
    FROM jsonb_array_elements(module_data->'exercices') WITH ORDINALITY AS ee(e, e_ord)
  )
)
WHERE module_id = 4;
