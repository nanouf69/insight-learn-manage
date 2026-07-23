
WITH targets AS (
  SELECT module_id, e_ord::int - 1 AS e_idx, q_ord::int - 1 AS q_idx
  FROM public.module_editor_state,
       jsonb_array_elements(module_data->'exercices') WITH ORDINALITY AS ex(exercise, e_ord),
       jsonb_array_elements(ex.exercise->'questions') WITH ORDINALITY AS qs(question, q_ord)
  WHERE module_id IN (4,9)
    AND ex.exercise->>'id' = '100'
    AND qs.question->>'id' = '129'
),
fixed AS (
  SELECT t.module_id, t.e_idx, t.q_idx,
    jsonb_build_object(
      'lettre','A',
      'texte', 'Fraude examen T3P dans les cinq ans qui précèdent sa demande',
      'correct', true
    ) ||
    jsonb_build_object() AS a,
    jsonb_build_object(
      'lettre','B',
      'texte','Avoir eu la carte professionnelle par équivalence',
      'correct', false
    ) AS b,
    jsonb_build_object(
      'lettre','C',
      'texte','Retrait définitif de sa carte professionnelle dans les 10 ans qui précèdent sa demande',
      'correct', true
    ) AS c
  FROM targets t
)
UPDATE public.module_editor_state m
SET module_data = jsonb_set(
      m.module_data,
      ARRAY['exercices', f.e_idx::text, 'questions', f.q_idx::text],
      (
        (m.module_data #> ARRAY['exercices', f.e_idx::text, 'questions', f.q_idx::text])
        || jsonb_build_object(
             'choix', jsonb_build_array(f.a, f.b, f.c),
             '_editedAt', to_jsonb(now()),
             'manually_edited', true
           )
      ),
      true
    ),
    updated_at = now()
FROM fixed f
WHERE m.module_id = f.module_id;
