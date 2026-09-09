
CREATE OR REPLACE FUNCTION public.jsonb_as_array(p jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN jsonb_typeof(p) = 'array' THEN p ELSE '[]'::jsonb END
$$;

GRANT EXECUTE ON FUNCTION public.jsonb_as_array(jsonb) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.log_module_editor_state_question_diff()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_author_id uuid := auth.uid();
  v_author_email text;
  v_role text := COALESCE(auth.role(), 'unknown');
  v_origin text;
  v_old jsonb := COALESCE(OLD.module_data, '{}'::jsonb);
  v_new jsonb := COALESCE(NEW.module_data, '{}'::jsonb);
  v_module_nom text := COALESCE(NEW.module_data->>'nom', OLD.module_data->>'nom');
  v_entries int := 0;
BEGIN
  v_origin := 'db_trigger:' || v_role || ':' || TG_OP;

  BEGIN
    SELECT email INTO v_author_email FROM auth.users WHERE id = v_author_id;
  EXCEPTION WHEN OTHERS THEN
    v_author_email := NULL;
  END;

  WITH old_q AS (
    SELECT (exo->>'id') AS exo_id, (q->>'id') AS q_id, q AS question
    FROM jsonb_array_elements(public.jsonb_as_array(v_old->'exercices')) AS exo
    LEFT JOIN LATERAL jsonb_array_elements(public.jsonb_as_array(exo->'questions')) AS q ON true
    WHERE q IS NOT NULL
  ),
  new_q AS (
    SELECT (exo->>'id') AS exo_id, (q->>'id') AS q_id, q AS question
    FROM jsonb_array_elements(public.jsonb_as_array(v_new->'exercices')) AS exo
    LEFT JOIN LATERAL jsonb_array_elements(public.jsonb_as_array(exo->'questions')) AS q ON true
    WHERE q IS NOT NULL
  ),
  deletes AS (
    SELECT o.exo_id, o.q_id, o.question AS before_q
    FROM old_q o LEFT JOIN new_q n USING (exo_id, q_id)
    WHERE n.q_id IS NULL
  ),
  adds AS (
    SELECT n.exo_id, n.q_id, n.question AS after_q
    FROM new_q n LEFT JOIN old_q o USING (exo_id, q_id)
    WHERE o.q_id IS NULL
  ),
  common AS (
    SELECT o.exo_id, o.q_id, o.question AS before_q, n.question AS after_q
    FROM old_q o JOIN new_q n USING (exo_id, q_id)
  ),
  changes AS (
    SELECT c.exo_id, c.q_id, c.before_q, c.after_q, f.field
    FROM common c
    CROSS JOIN LATERAL (VALUES
      ('reponseCorrecte'), ('choix'), ('reponseQRC'),
      ('enonce'), ('image'), ('imageSize'), ('type'), ('explication')
    ) AS f(field)
    WHERE (c.before_q -> f.field) IS DISTINCT FROM (c.after_q -> f.field)
  ),
  inserted AS (
    INSERT INTO public.module_admin_audit_log(
      module_id, module_nom, action, origin,
      exercice_id, question_id, field, summary,
      before_value, after_value, author_user_id, author_email
    )
    SELECT NEW.module_id, v_module_nom, 'admin_edit', v_origin,
      d.exo_id, d.q_id, 'question_deleted',
      'Question supprimée: ' || LEFT(COALESCE(d.before_q->>'enonce', ''), 120),
      d.before_q, NULL, v_author_id, v_author_email
    FROM deletes d
    UNION ALL
    SELECT NEW.module_id, v_module_nom, 'admin_edit', v_origin,
      a.exo_id, a.q_id, 'question_added',
      'Question ajoutée: ' || LEFT(COALESCE(a.after_q->>'enonce', ''), 120),
      NULL, a.after_q, v_author_id, v_author_email
    FROM adds a
    UNION ALL
    SELECT NEW.module_id, v_module_nom, 'admin_edit', v_origin,
      ch.exo_id, ch.q_id, ch.field,
      'Champ « ' || ch.field || ' » modifié',
      ch.before_q -> ch.field, ch.after_q -> ch.field,
      v_author_id, v_author_email
    FROM changes ch
    LIMIT 200
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_entries FROM inserted;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- L'audit ne doit jamais bloquer une sauvegarde (suppression comprise).
  RETURN NEW;
END;
$function$;

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
            COALESCE((
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
                          FROM jsonb_array_elements(public.jsonb_as_array(OLD.module_data->'exercices')) AS oe(exercise)
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
                          FROM jsonb_array_elements(public.jsonb_as_array(olde.old_exercise_value->'questions')) AS oq(question)
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
              FROM jsonb_array_elements(public.jsonb_as_array(e.exercise->'questions')) WITH ORDINALITY AS q(question, q_ord)
            ), '[]'::jsonb)
          )
        ELSE e.exercise
      END
      ORDER BY e.e_ord
    )
    INTO patched_exercices
    FROM jsonb_array_elements(public.jsonb_as_array(NEW.module_data->'exercices')) WITH ORDINALITY AS e(exercise, e_ord);

    NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', COALESCE(patched_exercices, '[]'::jsonb), true);
  END IF;

  RETURN NEW;
END;
$function$;
