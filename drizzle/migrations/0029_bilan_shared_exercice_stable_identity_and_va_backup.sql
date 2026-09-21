-- 1) Sauvegarde complète de l'état actuel du Bilan Examen VA (module 30) et des
--    modules bilans concernés, avant toute intervention. Aucune donnée pédagogique
--    n'est modifiée : copie additive en lecture.
CREATE TABLE IF NOT EXISTS public.backup_bilan_examen_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motif text NOT NULL,
  module_id integer NOT NULL,
  module_data jsonb NOT NULL,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_bilan_examen_modules TO authenticated;
GRANT ALL ON public.backup_bilan_examen_modules TO service_role;

ALTER TABLE public.backup_bilan_examen_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read bilan backups" ON public.backup_bilan_examen_modules;
CREATE POLICY "Admins can read bilan backups"
ON public.backup_bilan_examen_modules
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.backup_bilan_examen_modules (motif, module_id, module_data, source_updated_at)
SELECT 'avant_securisation_identite_matieres_2026_09_21', m.module_id, m.module_data, m.updated_at
FROM public.module_editor_state m
WHERE m.module_id IN (5, 11, 28, 30);

-- 2) Identité stable d'une matière partagée : le numéro technique d'exercice ne
--    suffit plus, il doit être associé à une clé stable de matière.
CREATE OR REPLACE FUNCTION public.shared_exercice_key(e jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(e->>'id','') || '::' || coalesce(
    nullif(btrim(coalesce(e->>'matiereKey','')), ''),
    regexp_replace(lower(coalesce(e->>'titre','')), '[^a-z0-9]+', '', 'g'),
    ''
  )
$$;

-- 3) Propagation des matières réellement communes uniquement.
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

  IF jsonb_typeof(coalesce(OLD.module_data->'exercices', 'null'::jsonb)) = 'array' THEN
    SELECT coalesce(array_agg(public.shared_exercice_key(e)), ARRAY[]::text[]) INTO v_removed
    FROM jsonb_array_elements(OLD.module_data->'exercices') e
    WHERE e->>'id' IS NOT NULL
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
      IF (v_exo->>'id') IS NOT NULL AND public.shared_exercice_key(v_exo) = ANY(v_removed) THEN
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

-- 4) Adoption à l'insertion : uniquement si la matière est réellement la même.
CREATE OR REPLACE FUNCTION public.adopt_shared_exercices_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        AND public.shared_exercice_key(e) = public.shared_exercice_key(v_exo)
      ORDER BY m.updated_at DESC
      LIMIT 1;
    END IF;
    v_new_exos := v_new_exos || jsonb_build_array(coalesce(v_ref, v_exo));
  END LOOP;

  NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', v_new_exos, true);
  RETURN NEW;
END;
$function$;