-- ============================================================
-- SOURCE UNIQUE POUR LES QUIZ PARTAGÉS ENTRE FORMATIONS
-- Un même exercice (même id) utilisé dans plusieurs modules est
-- désormais synchronisé par la BASE et non plus par le navigateur.
-- Aucune donnée apprenant n'est touchée (uniquement module_editor_state).
-- ============================================================

-- 1) Propagation des modifications vers toutes les autres occurrences
CREATE OR REPLACE FUNCTION public.propagate_shared_exercices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed jsonb := '[]'::jsonb;
  v_removed text[] := ARRAY[]::text[];
  v_exo jsonb;
  v_old_exo jsonb;
  v_repl jsonb;
  v_target record;
  v_new_exos jsonb;
  v_touched boolean;
BEGIN
  IF coalesce(current_setting('app.shared_exercice_sync', true), '0') = '1' THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(coalesce(NEW.module_data->'exercices', 'null'::jsonb)) <> 'array' THEN
    RETURN NULL;
  END IF;

  -- exercices réellement modifiés par cette écriture
  FOR v_exo IN SELECT value FROM jsonb_array_elements(NEW.module_data->'exercices') LOOP
    IF (v_exo->>'id') IS NULL THEN CONTINUE; END IF;
    v_old_exo := NULL;
    IF jsonb_typeof(coalesce(OLD.module_data->'exercices', 'null'::jsonb)) = 'array' THEN
      SELECT e INTO v_old_exo
      FROM jsonb_array_elements(OLD.module_data->'exercices') e
      WHERE e->>'id' = v_exo->>'id'
      LIMIT 1;
    END IF;
    IF v_old_exo IS NULL OR v_old_exo IS DISTINCT FROM v_exo THEN
      v_changed := v_changed || jsonb_build_array(v_exo);
    END IF;
  END LOOP;

  -- exercices supprimés par cette écriture
  IF jsonb_typeof(coalesce(OLD.module_data->'exercices', 'null'::jsonb)) = 'array' THEN
    SELECT coalesce(array_agg(e->>'id'), ARRAY[]::text[]) INTO v_removed
    FROM jsonb_array_elements(OLD.module_data->'exercices') e
    WHERE e->>'id' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.module_data->'exercices') n
        WHERE n->>'id' = e->>'id'
      );
  END IF;

  IF jsonb_array_length(v_changed) = 0 AND coalesce(array_length(v_removed, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.shared_exercice_sync', '1', true);

  FOR v_target IN
    SELECT module_id, module_data
    FROM public.module_editor_state
    WHERE module_id <> NEW.module_id
      AND jsonb_typeof(coalesce(module_data->'exercices', 'null'::jsonb)) = 'array'
      AND jsonb_array_length(module_data->'exercices') > 0
  LOOP
    v_touched := false;
    v_new_exos := '[]'::jsonb;

    FOR v_exo IN SELECT value FROM jsonb_array_elements(v_target.module_data->'exercices') LOOP
      IF (v_exo->>'id') IS NOT NULL AND (v_exo->>'id') = ANY(v_removed) THEN
        v_touched := true;
        CONTINUE;
      END IF;

      v_repl := NULL;
      IF (v_exo->>'id') IS NOT NULL THEN
        SELECT c INTO v_repl
        FROM jsonb_array_elements(v_changed) c
        WHERE c->>'id' = v_exo->>'id'
        LIMIT 1;
      END IF;

      IF v_repl IS NOT NULL AND v_repl IS DISTINCT FROM v_exo THEN
        v_touched := true;
        v_new_exos := v_new_exos || jsonb_build_array(v_repl);
      ELSE
        v_new_exos := v_new_exos || jsonb_build_array(v_exo);
      END IF;
    END LOOP;

    IF v_touched THEN
      UPDATE public.module_editor_state
      SET module_data = jsonb_set(module_data, '{exercices}', v_new_exos, true),
          updated_at = now()
      WHERE module_id = v_target.module_id;
    END IF;
  END LOOP;

  PERFORM set_config('app.shared_exercice_sync', '0', true);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_shared_exercices ON public.module_editor_state;
CREATE TRIGGER trg_propagate_shared_exercices
AFTER UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW
EXECUTE FUNCTION public.propagate_shared_exercices();

-- 2) Un module initialisé plus tard adopte la version de référence existante
--    (empêche une vieille copie statique de ressusciter du contenu supprimé)
CREATE OR REPLACE FUNCTION public.adopt_shared_exercices_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_exos jsonb := '[]'::jsonb;
  v_exo jsonb;
  v_ref jsonb;
BEGIN
  IF jsonb_typeof(coalesce(NEW.module_data->'exercices', 'null'::jsonb)) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR v_exo IN SELECT value FROM jsonb_array_elements(NEW.module_data->'exercices') LOOP
    v_ref := NULL;
    IF (v_exo->>'id') IS NOT NULL THEN
      SELECT e INTO v_ref
      FROM public.module_editor_state m,
           LATERAL jsonb_array_elements(m.module_data->'exercices') e
      WHERE m.module_id <> NEW.module_id
        AND jsonb_typeof(coalesce(m.module_data->'exercices', 'null'::jsonb)) = 'array'
        AND e->>'id' = v_exo->>'id'
      ORDER BY m.updated_at DESC
      LIMIT 1;
    END IF;
    v_new_exos := v_new_exos || jsonb_build_array(coalesce(v_ref, v_exo));
  END LOOP;

  NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', v_new_exos, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adopt_shared_exercices ON public.module_editor_state;
CREATE TRIGGER trg_adopt_shared_exercices
BEFORE INSERT ON public.module_editor_state
FOR EACH ROW
EXECUTE FUNCTION public.adopt_shared_exercices_on_insert();

-- 3) Convergence unique des divergences existantes :
--    pour chaque exercice partagé, la copie la plus récemment enregistrée
--    devient la référence pour toutes les autres occurrences.
DO $$
DECLARE
  rec record;
BEGIN
  PERFORM set_config('app.shared_exercice_sync', '1', true);

  FOR rec IN
    WITH ex AS (
      SELECT m.module_id, m.updated_at, e->>'id' AS ex_id, e AS exo
      FROM public.module_editor_state m,
           LATERAL jsonb_array_elements(m.module_data->'exercices') e
      WHERE jsonb_typeof(coalesce(m.module_data->'exercices', 'null'::jsonb)) = 'array'
        AND e->>'id' IS NOT NULL
    ),
    ranked AS (
      SELECT ex_id, exo,
             row_number() OVER (PARTITION BY ex_id ORDER BY updated_at DESC, module_id DESC) AS rn,
             count(*) OVER (PARTITION BY ex_id) AS cnt
      FROM ex
    )
    SELECT ex_id, exo FROM ranked WHERE rn = 1 AND cnt > 1
  LOOP
    UPDATE public.module_editor_state m
    SET module_data = jsonb_set(
          m.module_data,
          '{exercices}',
          (
            SELECT jsonb_agg(CASE WHEN t.e->>'id' = rec.ex_id THEN rec.exo ELSE t.e END ORDER BY t.ord)
            FROM jsonb_array_elements(m.module_data->'exercices') WITH ORDINALITY AS t(e, ord)
          ),
          true
        ),
        updated_at = now()
    WHERE jsonb_typeof(coalesce(m.module_data->'exercices', 'null'::jsonb)) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(m.module_data->'exercices') e2
        WHERE e2->>'id' = rec.ex_id AND e2 IS DISTINCT FROM rec.exo
      );
  END LOOP;

  PERFORM set_config('app.shared_exercice_sync', '0', true);
END;
$$;