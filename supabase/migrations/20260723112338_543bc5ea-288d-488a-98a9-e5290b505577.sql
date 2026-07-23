-- Normalize manual edit markers already stored in module_editor_state
UPDATE public.module_editor_state mes
SET module_data = jsonb_set(
  mes.module_data,
  '{exercices}',
  COALESCE(patched.exercices, '[]'::jsonb),
  true
),
updated_at = now()
FROM (
  SELECT
    m.id,
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(exercise->'questions') = 'array' THEN
          exercise || jsonb_build_object(
            'questions',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN (question ? '_editedAt') OR COALESCE((question->>'manually_edited')::boolean, false) THEN
                    question
                    || jsonb_build_object('manually_edited', true)
                    || CASE
                        WHEN question ? '_editedAt' THEN '{}'::jsonb
                        ELSE jsonb_build_object('_editedAt', now())
                       END
                  ELSE question
                END
                ORDER BY q_ord
              )
              FROM jsonb_array_elements(exercise->'questions') WITH ORDINALITY AS q(question, q_ord)
            )
          )
        ELSE exercise
      END
      ORDER BY e_ord
    ) AS exercices
  FROM public.module_editor_state m
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.module_data->'exercices', '[]'::jsonb)) WITH ORDINALITY AS e(exercise, e_ord)
  GROUP BY m.id
) patched
WHERE patched.id = mes.id
  AND mes.module_id IN (4, 5, 9, 11, 27, 28, 29, 81, 82, 90);

-- Legacy fournisseur overrides for Bilan modules are no longer authoritative.
-- Keep the rows for audit/history but archive their quiz_id so the app cannot apply them.
UPDATE public.quiz_questions_overrides
SET quiz_id = 'archived:' || quiz_id,
    updated_at = now()
WHERE quiz_id IN (
  'bilan-exercices-vtc',
  'bilan-exercices-taxi',
  'bilan-examen-vtc',
  'bilan-examen-taxi',
  'bilan-exercices-ta',
  'bilan-examen-ta',
  'bilan-exercices-va'
);

CREATE OR REPLACE FUNCTION public.ensure_module_editor_manual_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  patched_exercices jsonb;
BEGIN
  IF NEW.module_id IN (4, 5, 9, 11, 27, 28, 29, 81, 82, 90)
     AND jsonb_typeof(NEW.module_data->'exercices') = 'array' THEN
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(exercise->'questions') = 'array' THEN
          exercise || jsonb_build_object(
            'questions',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN (question ? '_editedAt') OR COALESCE((question->>'manually_edited')::boolean, false) THEN
                    question
                    || jsonb_build_object('manually_edited', true)
                    || CASE
                        WHEN question ? '_editedAt' THEN '{}'::jsonb
                        ELSE jsonb_build_object('_editedAt', now())
                       END
                  ELSE question
                END
                ORDER BY q_ord
              )
              FROM jsonb_array_elements(exercise->'questions') WITH ORDINALITY AS q(question, q_ord)
            )
          )
        ELSE exercise
      END
      ORDER BY e_ord
    )
    INTO patched_exercices
    FROM jsonb_array_elements(NEW.module_data->'exercices') WITH ORDINALITY AS e(exercise, e_ord);

    NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', COALESCE(patched_exercices, '[]'::jsonb), true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_module_editor_manual_flags_before_write ON public.module_editor_state;
CREATE TRIGGER ensure_module_editor_manual_flags_before_write
BEFORE INSERT OR UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW
EXECUTE FUNCTION public.ensure_module_editor_manual_flags();