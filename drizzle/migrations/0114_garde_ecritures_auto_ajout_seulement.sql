CREATE OR REPLACE FUNCTION public.garde_retrait_massif_questions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_retirees int;
  v_auto boolean;
  v_exos jsonb;
  v_old_e jsonb;
  v_idx int;
  v_missing jsonb;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.module_data IS NULL THEN
    RETURN NEW;
  END IF;

  -- Écriture automatique = déclencheur imbriqué (propagation, reconstruction de bilan…),
  -- fonction serveur (service_role) ou script sans session (cron, migration, SQL direct).
  v_auto := pg_trigger_depth() > 1 OR COALESCE(auth.role(), 'unknown') <> 'authenticated';

  IF v_auto THEN
    -- AJOUT / MISE À JOUR SEULEMENT : toute question ou exercice retiré est remis en place.
    v_exos := COALESCE(NEW.module_data->'exercices', '[]'::jsonb);
    FOR v_old_e IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices','[]'::jsonb)) LOOP
      SELECT (o - 1)::int INTO v_idx FROM jsonb_array_elements(v_exos) WITH ORDINALITY e(x, o)
      WHERE x->>'id' = v_old_e->>'id' LIMIT 1;
      IF v_idx IS NULL THEN
        v_exos := v_exos || jsonb_build_array(v_old_e);
      ELSE
        SELECT COALESCE(jsonb_agg(oq ORDER BY o), '[]'::jsonb) INTO v_missing
        FROM jsonb_array_elements(COALESCE(v_old_e->'questions','[]'::jsonb)) WITH ORDINALITY q(oq, o)
        WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(v_exos->v_idx->'questions','[]'::jsonb)) nq
          WHERE nq->>'id' = oq->>'id');
        IF jsonb_array_length(v_missing) > 0 THEN
          v_exos := jsonb_set(v_exos, ARRAY[v_idx::text, 'questions'],
                      COALESCE(v_exos->v_idx->'questions','[]'::jsonb) || v_missing);
        END IF;
      END IF;
      v_idx := NULL;
    END LOOP;
    NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', v_exos);
    RETURN NEW;
  END IF;

  -- Enregistrement manuel dans l'éditeur : au plus 2 questions retirées à la fois.
  SELECT count(*) INTO v_retirees FROM (
    SELECT (e->>'id') || ':' || (q->>'id') AS k
    FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(COALESCE(e->'questions','[]'::jsonb)) q
    EXCEPT
    SELECT (e->>'id') || ':' || (q->>'id')
    FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(COALESCE(e->'questions','[]'::jsonb)) q
  ) s;
  IF v_retirees > 2 THEN
    RAISE EXCEPTION 'Enregistrement refusé : il retirerait % questions du module % d''un coup (maximum 2).', v_retirees, NEW.module_id
      USING ERRCODE = 'P0520';
  END IF;
  RETURN NEW;
END $function$;