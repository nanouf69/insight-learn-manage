
-- Repair corrupted choix in module 9 (Bilan TAXI) exercice 102 (Sécurité Routière)
-- Source of truth: module 4 (Bilan VTC) exercice 102, matched by enonce + image.

WITH source_q AS (
  SELECT
    q.value->>'enonce' AS enonce,
    COALESCE(q.value->>'image','') AS image,
    q.value->'choix' AS choix
  FROM public.module_editor_state m,
       jsonb_array_elements(m.module_data->'exercices') e,
       jsonb_array_elements(e.value->'questions') q
  WHERE m.module_id = 4 AND (e.value->>'id')::int = 102
),
target AS (
  SELECT
    e.ordinality AS exo_ord,
    e.value AS exo,
    q.ordinality AS q_ord,
    q.value AS q
  FROM public.module_editor_state m,
       jsonb_array_elements(m.module_data->'exercices') WITH ORDINALITY e,
       jsonb_array_elements(e.value->'questions') WITH ORDINALITY q
  WHERE m.module_id = 9 AND (e.value->>'id')::int = 102
),
repaired_q AS (
  SELECT
    t.exo_ord,
    t.q_ord,
    CASE
      WHEN s.choix IS NOT NULL
       AND md5(s.choix::text) IS DISTINCT FROM md5((t.q->'choix')::text)
      THEN t.q
           || jsonb_build_object('choix', s.choix)
           || jsonb_build_object('manually_edited', true)
           || jsonb_build_object('_editedAt', to_jsonb(now()))
           || jsonb_build_object('_repairedAt', to_jsonb(now()))
           || jsonb_build_object('_repairReason', 'cascade_duplicate_choix_from_module_4')
      ELSE t.q
    END AS q_final
  FROM target t
  LEFT JOIN source_q s
    ON s.enonce = t.q->>'enonce'
   AND s.image  = COALESCE(t.q->>'image','')
),
new_questions AS (
  SELECT exo_ord, jsonb_agg(q_final ORDER BY q_ord) AS questions
  FROM repaired_q
  GROUP BY exo_ord
),
new_exercices AS (
  SELECT jsonb_agg(
    CASE
      WHEN (e.value->>'id')::int = 102 THEN
        jsonb_set(e.value, '{questions}', COALESCE(nq.questions, '[]'::jsonb), true)
      ELSE e.value
    END
    ORDER BY e.ordinality
  ) AS exercices
  FROM public.module_editor_state m,
       jsonb_array_elements(m.module_data->'exercices') WITH ORDINALITY e
  LEFT JOIN new_questions nq ON nq.exo_ord = e.ordinality
  WHERE m.module_id = 9
)
UPDATE public.module_editor_state
SET module_data = jsonb_set(module_data, '{exercices}', (SELECT exercices FROM new_exercices), true),
    updated_at = now()
WHERE module_id = 9;

-- Log the repair for audit
INSERT INTO public.alertes_systeme (type, titre, message, details)
VALUES (
  'bilan_repair',
  'Réparation Bilan TAXI Sécurité Routière (module 9)',
  'Restauration des propositions dupliquées en cascade depuis le Bilan VTC (module 4).',
  jsonb_build_object(
    'module_cible', 9,
    'exercice', 102,
    'source_module', 4,
    'repaired_at', now()
  )::text
);
