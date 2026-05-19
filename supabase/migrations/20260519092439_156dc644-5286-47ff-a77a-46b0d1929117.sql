-- Restaure l'exercice "Bilan T3P — Partie 1 + Partie 2" (id 100) du module 4
-- à partir de la version propre à 128 questions stockée pour le module 9.
WITH src AS (
  SELECT e AS exo
  FROM public.module_editor_state, jsonb_array_elements(module_data->'exercices') e
  WHERE module_id = 9 AND (e->>'id') = '100'
  LIMIT 1
),
target AS (
  SELECT m.id, m.module_data, idx - 1 AS pos
  FROM public.module_editor_state m,
       jsonb_array_elements(m.module_data->'exercices') WITH ORDINALITY arr(elem, idx)
  WHERE m.module_id = 4 AND (elem->>'id') = '100'
  LIMIT 1
)
UPDATE public.module_editor_state m
SET module_data = jsonb_set(
      m.module_data,
      ARRAY['exercices', target.pos::text],
      (SELECT exo FROM src)
    ),
    updated_at = now()
FROM target
WHERE m.id = target.id;