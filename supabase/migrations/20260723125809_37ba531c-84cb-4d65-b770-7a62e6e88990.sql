CREATE OR REPLACE FUNCTION public.ensure_module_editor_manual_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  patched_exercices jsonb;
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
                question
                || jsonb_build_object('manually_edited', true)
                || CASE
                    WHEN question ? '_editedAt' THEN '{}'::jsonb
                    ELSE jsonb_build_object('_editedAt', now())
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

UPDATE public.module_editor_state
SET module_data = module_data,
    updated_at = now()
WHERE module_id IN (4, 5, 7, 9, 10, 11, 12, 13, 24, 27, 28, 29, 40, 42, 64, 81, 82, 90)
  AND jsonb_typeof(module_data->'exercices') = 'array';

DROP FUNCTION IF EXISTS public.repair_bilan_security_questions_from_payload(jsonb);