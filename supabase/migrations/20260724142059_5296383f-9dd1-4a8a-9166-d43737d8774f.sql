
-- 1) Autoriser le trigger SECURITY DEFINER à écrire dans le journal
--    (le journal reste protégé en lecture par RLS admin déjà en place)
GRANT INSERT ON public.module_admin_audit_log TO authenticated, anon, service_role;

-- 2) Fonction de diff question-par-question, appelée par trigger AFTER UPDATE/INSERT
CREATE OR REPLACE FUNCTION public.log_module_editor_state_question_diff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Origine = rôle Postgres + opération, permet de distinguer un edit admin
  -- (authenticated) d'un service_role (edge/script) ou d'une propagation.
  v_origin := 'db_trigger:' || v_role || ':' || TG_OP;

  BEGIN
    SELECT email INTO v_author_email FROM auth.users WHERE id = v_author_id;
  EXCEPTION WHEN OTHERS THEN
    v_author_email := NULL;
  END;

  -- Construire la map (exerciceId#questionId) -> question pour old et new
  WITH old_q AS (
    SELECT
      (exo->>'id')          AS exo_id,
      (q->>'id')            AS q_id,
      q                     AS question
    FROM jsonb_array_elements(COALESCE(v_old->'exercices', '[]'::jsonb)) AS exo
    LEFT JOIN LATERAL jsonb_array_elements(COALESCE(exo->'questions', '[]'::jsonb)) AS q ON true
    WHERE q IS NOT NULL
  ),
  new_q AS (
    SELECT
      (exo->>'id')          AS exo_id,
      (q->>'id')            AS q_id,
      q                     AS question
    FROM jsonb_array_elements(COALESCE(v_new->'exercices', '[]'::jsonb)) AS exo
    LEFT JOIN LATERAL jsonb_array_elements(COALESCE(exo->'questions', '[]'::jsonb)) AS q ON true
    WHERE q IS NOT NULL
  ),
  -- Suppressions
  deletes AS (
    SELECT o.exo_id, o.q_id, o.question AS before_q
    FROM old_q o
    LEFT JOIN new_q n USING (exo_id, q_id)
    WHERE n.q_id IS NULL
  ),
  -- Ajouts
  adds AS (
    SELECT n.exo_id, n.q_id, n.question AS after_q
    FROM new_q n
    LEFT JOIN old_q o USING (exo_id, q_id)
    WHERE o.q_id IS NULL
  ),
  -- Modifications champ par champ (uniquement les champs pédagogiquement sensibles)
  common AS (
    SELECT o.exo_id, o.q_id, o.question AS before_q, n.question AS after_q
    FROM old_q o
    JOIN new_q n USING (exo_id, q_id)
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
    -- Suppressions
    INSERT INTO public.module_admin_audit_log(
      module_id, module_nom, action, origin,
      exercice_id, question_id, field, summary,
      before_value, after_value, author_user_id, author_email
    )
    SELECT
      NEW.module_id, v_module_nom, 'admin_edit', v_origin,
      d.exo_id, d.q_id, 'question_deleted',
      'Question supprimée: ' || LEFT(COALESCE(d.before_q->>'enonce', ''), 120),
      d.before_q, NULL, v_author_id, v_author_email
    FROM deletes d
    UNION ALL
    -- Ajouts
    SELECT
      NEW.module_id, v_module_nom, 'admin_edit', v_origin,
      a.exo_id, a.q_id, 'question_added',
      'Question ajoutée: ' || LEFT(COALESCE(a.after_q->>'enonce', ''), 120),
      NULL, a.after_q, v_author_id, v_author_email
    FROM adds a
    UNION ALL
    -- Modifications par champ
    SELECT
      NEW.module_id, v_module_nom, 'admin_edit', v_origin,
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
END;
$$;

-- 3) Trigger AFTER pour INSERT + UPDATE (on ne veut pas bloquer la sauvegarde)
DROP TRIGGER IF EXISTS trg_log_module_editor_state_question_diff ON public.module_editor_state;
CREATE TRIGGER trg_log_module_editor_state_question_diff
AFTER INSERT OR UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW
EXECUTE FUNCTION public.log_module_editor_state_question_diff();
