
-- 1) Extend the trigger function to cover Bilan modules 30 (Bilan Examen VA)
--    and 87 (Bilan fin de formation continue VTC). Same logic as the existing
--    modules; add these two IDs to the whitelist so every save re-stamps
--    manually_edited/_editedAt on all questions.
CREATE OR REPLACE FUNCTION public.ensure_module_editor_manual_flags()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  patched_exercices jsonb;
BEGIN
  IF NEW.module_id IN (4, 5, 7, 9, 10, 11, 12, 13, 24, 27, 28, 29, 30, 40, 42, 64, 81, 82, 87, 90)
     AND jsonb_typeof(NEW.module_data->'exercices') = 'array' THEN
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(e.exercise->'questions') = 'array' THEN
          e.exercise || jsonb_build_object(
            'questions',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN OLD.module_data IS NOT NULL THEN
                    COALESCE(
                      (
                        SELECT CASE
                          WHEN oldq.old_question_value IS NOT NULL
                               AND oldq.old_edited_at IS NOT NULL
                               AND (newq.new_edited_at IS NULL OR oldq.old_edited_at > newq.new_edited_at)
                            THEN oldq.old_question_value
                          ELSE q.question
                            || jsonb_build_object('manually_edited', true)
                            || CASE
                                WHEN q.question ? '_editedAt' THEN '{}'::jsonb
                                ELSE jsonb_build_object('_editedAt', now())
                               END
                        END
                        FROM LATERAL (
                          SELECT oe.exercise AS old_exercise_value
                          FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices', '[]'::jsonb)) AS oe(exercise)
                          WHERE (oe.exercise->>'id') = (e.exercise->>'id')
                          LIMIT 1
                        ) olde
                        LEFT JOIN LATERAL (
                          SELECT
                            oq.question AS old_question_value,
                            CASE
                              WHEN oq.question ? '_editedAt'
                                THEN NULLIF(oq.question->>'_editedAt', '')::timestamptz
                              ELSE NULL
                            END AS old_edited_at
                          FROM jsonb_array_elements(COALESCE(olde.old_exercise_value->'questions', '[]'::jsonb)) AS oq(question)
                          WHERE (oq.question->>'id') = (q.question->>'id')
                          LIMIT 1
                        ) oldq ON true
                        CROSS JOIN LATERAL (
                          SELECT CASE
                            WHEN q.question ? '_editedAt'
                              THEN NULLIF(q.question->>'_editedAt', '')::timestamptz
                            ELSE NULL
                          END AS new_edited_at
                        ) newq
                      ),
                      q.question
                        || jsonb_build_object('manually_edited', true)
                        || CASE
                            WHEN q.question ? '_editedAt' THEN '{}'::jsonb
                            ELSE jsonb_build_object('_editedAt', now())
                           END
                    )
                  ELSE q.question
                    || jsonb_build_object('manually_edited', true)
                    || CASE
                        WHEN q.question ? '_editedAt' THEN '{}'::jsonb
                        ELSE jsonb_build_object('_editedAt', now())
                       END
                END
                ORDER BY q.q_ord
              )
              FROM jsonb_array_elements(e.exercise->'questions') WITH ORDINALITY AS q(question, q_ord)
            )
          )
        ELSE e.exercise
      END
      ORDER BY e.e_ord
    )
    INTO patched_exercices
    FROM jsonb_array_elements(NEW.module_data->'exercices') WITH ORDINALITY AS e(exercise, e_ord);

    NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', COALESCE(patched_exercices, '[]'::jsonb), true);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) One-shot backfill: mark every existing question in modules 30 and 87 as
--    manually edited so the refresh path can never replace them from source.
UPDATE public.module_editor_state s
SET module_data = jsonb_set(
      s.module_data,
      '{exercices}',
      (
        SELECT COALESCE(jsonb_agg(
          CASE
            WHEN jsonb_typeof(e.exercise->'questions') = 'array' THEN
              e.exercise || jsonb_build_object(
                'questions',
                (
                  SELECT jsonb_agg(
                    q.question
                      || jsonb_build_object('manually_edited', true)
                      || CASE
                          WHEN q.question ? '_editedAt' THEN '{}'::jsonb
                          ELSE jsonb_build_object('_editedAt', now())
                         END
                    ORDER BY q.q_ord
                  )
                  FROM jsonb_array_elements(e.exercise->'questions') WITH ORDINALITY AS q(question, q_ord)
                )
              )
            ELSE e.exercise
          END
          ORDER BY e.e_ord
        ), '[]'::jsonb)
        FROM jsonb_array_elements(s.module_data->'exercices') WITH ORDINALITY AS e(exercise, e_ord)
      ),
      true
    ),
    updated_at = now()
WHERE s.module_id IN (30, 87)
  AND jsonb_typeof(s.module_data->'exercices') = 'array';
