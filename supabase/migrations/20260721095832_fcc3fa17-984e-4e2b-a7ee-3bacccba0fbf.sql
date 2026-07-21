
-- Reinject missing choice B on the T3P "agents habilités à contrôler" question across all modules
WITH targets AS (
  SELECT
    m.module_id,
    (elt_ex.idx - 1)::int   AS ex_idx,
    (elt_q.idx  - 1)::int   AS q_idx,
    elt_q.value             AS question
  FROM module_editor_state m,
       jsonb_array_elements(m.module_data->'exercices') WITH ORDINALITY AS elt_ex(value, idx),
       jsonb_array_elements(elt_ex.value->'questions')  WITH ORDINALITY AS elt_q(value, idx)
  WHERE elt_q.value->>'enonce' ILIKE '%habilités à contrôler un conducteur T3P%'
    AND jsonb_array_length(elt_q.value->'choix') = 3
),
patched AS (
  SELECT
    module_id,
    ex_idx,
    q_idx,
    jsonb_set(
      question,
      '{choix}',
      jsonb_build_array(
        question->'choix'->0,
        jsonb_build_object('lettre','B','texte','Agents DRIEAT/DREAL','correct',true),
        question->'choix'->1,
        question->'choix'->2
      )
    ) AS new_question
  FROM targets
)
UPDATE module_editor_state m
SET module_data = jsonb_set(
      m.module_data,
      ARRAY['exercices', p.ex_idx::text, 'questions', p.q_idx::text],
      p.new_question,
      false
    ),
    updated_at = now()
FROM patched p
WHERE m.module_id = p.module_id;
