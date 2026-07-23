CREATE OR REPLACE FUNCTION public.ensure_module_editor_manual_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  patched_exercices jsonb;
  old_exercise jsonb;
  old_question jsonb;
  old_ts timestamptz;
  new_ts timestamptz;
BEGIN
  IF NEW.module_id IN (4, 5, 7, 9, 10, 11, 12, 13, 24, 27, 28, 29, 40, 42, 64, 81, 82, 90)
     AND jsonb_typeof(NEW.module_data->'exercices') = 'array' THEN
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(exercise->'questions') = 'array' THEN
          exercise || jsonb_build_object(
            'questions',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN OLD.module_data IS NOT NULL THEN
                    (
                      SELECT CASE
                        WHEN old_question IS NOT NULL THEN
                          CASE
                            WHEN old_ts IS NOT NULL
                                 AND (new_ts IS NULL OR old_ts > new_ts)
                              THEN old_question
                            ELSE question
                              || jsonb_build_object('manually_edited', true)
                              || CASE
                                  WHEN question ? '_editedAt' THEN '{}'::jsonb
                                  ELSE jsonb_build_object('_editedAt', now())
                                 END
                          END
                        ELSE question
                          || jsonb_build_object('manually_edited', true)
                          || CASE
                              WHEN question ? '_editedAt' THEN '{}'::jsonb
                              ELSE jsonb_build_object('_editedAt', now())
                             END
                      END
                      FROM LATERAL (
                        SELECT oe.exercise AS old_exercise_value
                        FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices', '[]'::jsonb)) AS oe(exercise)
                        WHERE (oe.exercise->>'id') = (exercise->>'id')
                        LIMIT 1
                      ) old_exercise_lookup
                      LEFT JOIN LATERAL (
                        SELECT oq.question AS old_question_value
                        FROM jsonb_array_elements(COALESCE(old_exercise_lookup.old_exercise_value->'questions', '[]'::jsonb)) AS oq(question)
                        WHERE (oq.question->>'id') = (question->>'id')
                        LIMIT 1
                      ) old_question_lookup ON true
                      CROSS JOIN LATERAL (
                        SELECT
                          old_question_lookup.old_question_value AS old_question,
                          CASE
                            WHEN old_question_lookup.old_question_value ? '_editedAt'
                              THEN NULLIF(old_question_lookup.old_question_value->>'_editedAt', '')::timestamptz
                            ELSE NULL
                          END AS old_ts,
                          CASE
                            WHEN question ? '_editedAt'
                              THEN NULLIF(question->>'_editedAt', '')::timestamptz
                            ELSE NULL
                          END AS new_ts
                      ) ts
                    )
                  ELSE question
                    || jsonb_build_object('manually_edited', true)
                    || CASE
                        WHEN question ? '_editedAt' THEN '{}'::jsonb
                        ELSE jsonb_build_object('_editedAt', now())
                       END
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
$function$;