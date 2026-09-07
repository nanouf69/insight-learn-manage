-- 1. Corriger les rattachements erronés (module 27 : exercices réels 250/251)
DELETE FROM public.quiz_question_bindings
 WHERE quiz_id = 'bilan-exercices-ta' AND module_id = 27 AND exercise_id NOT IN (250, 251);

INSERT INTO public.quiz_question_bindings(quiz_id, module_id, exercise_id, section_id) VALUES
  ('bilan-exercices-ta', 27, 250, 250),
  ('bilan-exercices-ta', 27, 251, 251),
  ('reglementation-nationale', 42, 70, 70),
  ('reglementation-nationale', 42, 71, 71)
ON CONFLICT DO NOTHING;

-- 2. Compléter la source canonique pour TOUS les quiz rattachés
WITH module_candidates AS (
  SELECT b.quiz_id,
         b.section_id,
         (q.value->>'id')::bigint AS legacy_question_id,
         q.ordinality::integer AS position,
         COALESCE(q.value->>'enonce','') AS enonce,
         COALESCE(q.value->'choix','[]'::jsonb) AS choix,
         q.value->>'image' AS image,
         q.value->>'imageSize' AS image_size,
         q.value->>'explication' AS explication,
         COALESCE(NULLIF(q.value->>'_editedAt','')::timestamptz, mes.updated_at) AS candidate_updated_at,
         jsonb_build_object('module_id', mes.module_id, 'exercise_id', b.exercise_id) AS source_reference
  FROM public.quiz_question_bindings b
  JOIN public.module_editor_state mes ON mes.module_id = b.module_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mes.module_data->'exercices','[]'::jsonb)) e(value)
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.value->'questions','[]'::jsonb)) WITH ORDINALITY q(value, ordinality)
  WHERE (e.value->>'id')::bigint = b.exercise_id
    AND q.value ? 'id'
), ranked AS (
  SELECT c.*, row_number() OVER (
           PARTITION BY quiz_id, section_id, legacy_question_id
           ORDER BY candidate_updated_at DESC, source_reference::text DESC
         ) AS winner_rank
  FROM module_candidates c
), winners AS (
  SELECT * FROM ranked WHERE winner_rank = 1
), upserted AS (
  INSERT INTO public.quiz_questions(
    quiz_id, section_id, legacy_question_id, position, enonce, choix,
    image, image_size, explication, active, source, updated_at
  )
  SELECT quiz_id, section_id, legacy_question_id, position,
         CASE WHEN enonce = '__DELETED__' THEN '' ELSE enonce END,
         CASE WHEN enonce = '__DELETED__' THEN '[]'::jsonb ELSE choix END,
         image, image_size, explication,
         enonce <> '__DELETED__',
         'migration-all-modules',
         candidate_updated_at
  FROM winners
  ON CONFLICT (quiz_id, section_id, legacy_question_id) DO UPDATE
    SET position = EXCLUDED.position,
        enonce = EXCLUDED.enonce,
        choix = EXCLUDED.choix,
        image = EXCLUDED.image,
        image_size = EXCLUDED.image_size,
        explication = EXCLUDED.explication,
        active = EXCLUDED.active,
        source = EXCLUDED.source,
        updated_at = EXCLUDED.updated_at
    WHERE EXCLUDED.updated_at > public.quiz_questions.updated_at
  RETURNING question_id, quiz_id, section_id, legacy_question_id
)
INSERT INTO public.quiz_question_migration_audit(
  quiz_id, section_id, legacy_question_id, canonical_question_id,
  source_kind, source_reference, source_updated_at, was_selected, content_fingerprint
)
SELECT w.quiz_id, w.section_id, w.legacy_question_id, u.question_id,
       'module', w.source_reference, w.candidate_updated_at, u.question_id IS NOT NULL,
       md5(w.enonce || '|' || w.choix::text)
FROM winners w
LEFT JOIN upserted u
  ON u.quiz_id = w.quiz_id AND u.section_id = w.section_id AND u.legacy_question_id = w.legacy_question_id;