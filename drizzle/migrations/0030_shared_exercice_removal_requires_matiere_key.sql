-- Sécurise la propagation des SUPPRESSIONS d'exercices entre modules.
-- Cause de l'incident : la suppression des exercices 600/601 du module VA a été
-- propagée au module TAXI parce que la clé de partage retombait sur
-- id + titre normalisé (matiereKey absent en base), donc deux matières
-- distinctes portant le même numéro technique étaient vues comme identiques.
-- Désormais une suppression n'est propagée QUE si l'exercice supprimé ET
-- l'exercice cible portent tous les deux la même matiereKey explicite.

CREATE OR REPLACE FUNCTION public.shared_exercice_strict_key(e jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN nullif(btrim(coalesce(e->>'matiereKey','')), '') IS NULL THEN NULL
    ELSE coalesce(e->>'id','') || '::' || btrim(e->>'matiereKey')
  END
$function$;

CREATE OR REPLACE FUNCTION public.propagate_shared_exercices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  FOR v_exo IN SELECT value FROM jsonb_array_elements(NEW.module_data->'exercices') LOOP
    IF (v_exo->>'id') IS NULL THEN CONTINUE; END IF;
    v_old_exo := NULL;
    IF jsonb_typeof(coalesce(OLD.module_data->'exercices', 'null'::jsonb)) = 'array' THEN
      SELECT e INTO v_old_exo
      FROM jsonb_array_elements(OLD.module_data->'exercices') e
      WHERE public.shared_exercice_key(e) = public.shared_exercice_key(v_exo)
      LIMIT 1;
    END IF;
    IF v_old_exo IS NULL OR v_old_exo IS DISTINCT FROM v_exo THEN
      v_changed := v_changed || jsonb_build_array(v_exo);
    END IF;
  END LOOP;

  -- Suppressions : uniquement les exercices portant une matiereKey explicite.
  IF jsonb_typeof(coalesce(OLD.module_data->'exercices', 'null'::jsonb)) = 'array' THEN
    SELECT coalesce(array_agg(public.shared_exercice_strict_key(e)), ARRAY[]::text[]) INTO v_removed
    FROM jsonb_array_elements(OLD.module_data->'exercices') e
    WHERE e->>'id' IS NOT NULL
      AND public.shared_exercice_strict_key(e) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.module_data->'exercices') n
        WHERE public.shared_exercice_key(n) = public.shared_exercice_key(e)
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
      IF (v_exo->>'id') IS NOT NULL
         AND public.shared_exercice_strict_key(v_exo) IS NOT NULL
         AND public.shared_exercice_strict_key(v_exo) = ANY(v_removed) THEN
        v_touched := true;
        CONTINUE;
      END IF;

      v_repl := NULL;
      IF (v_exo->>'id') IS NOT NULL THEN
        SELECT c INTO v_repl
        FROM jsonb_array_elements(v_changed) c
        WHERE public.shared_exercice_key(c) = public.shared_exercice_key(v_exo)
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
$function$;