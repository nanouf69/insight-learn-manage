-- Étendre le trigger ensure_module_editor_manual_flags à TOUS les modules
-- avec quiz éditables par un formateur, pour garantir en base le flag
-- manually_edited + _editedAt sur les questions touchées par l'admin.
CREATE OR REPLACE FUNCTION public.ensure_module_editor_manual_flags()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;