CREATE OR REPLACE FUNCTION public.save_module_editor_state(
  p_module_id integer,
  p_module_data jsonb,
  p_deleted_cours jsonb,
  p_deleted_exercices jsonb,
  p_source_fingerprint text,
  p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_row public.module_editor_state%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_current_row
  FROM public.module_editor_state s
  WHERE s.module_id = p_module_id
  FOR UPDATE;

  IF FOUND THEN
    -- Idempotence: do not bump updated_at for a duplicate/no-op save.
    -- This prevents realtime echoes, cache reloads, or duplicate debounced calls
    -- from creating a newer timestamp that then blocks the user's next real edit.
    IF v_current_row.module_data IS NOT DISTINCT FROM p_module_data
       AND v_current_row.deleted_cours IS NOT DISTINCT FROM COALESCE(p_deleted_cours, '[]'::jsonb)
       AND v_current_row.deleted_exercices IS NOT DISTINCT FROM COALESCE(p_deleted_exercices, '[]'::jsonb)
       AND v_current_row.source_fingerprint IS NOT DISTINCT FROM p_source_fingerprint THEN
      RETURN QUERY SELECT v_current_row.updated_at;
      RETURN;
    END IF;

    -- Compare-and-swap: refuse une écriture si la version en base est plus récente
    -- que celle qu'a lue le client. Cela bloque les onglets admin restés ouverts
    -- avec un ancien snapshot qui écraseraient les corrections récentes.
    IF p_expected_updated_at IS NOT NULL
       AND v_current_row.updated_at > (p_expected_updated_at + interval '1 millisecond') THEN
      RAISE EXCEPTION 'stale_module_editor_state_write: module_id=% expected=% actual=%',
        p_module_id, p_expected_updated_at, v_current_row.updated_at
        USING ERRCODE = 'P0409',
              HINT = 'Recharger le module pour récupérer la dernière version avant de réenregistrer.';
    END IF;

    UPDATE public.module_editor_state s
      SET module_data = p_module_data,
          deleted_cours = COALESCE(p_deleted_cours, '[]'::jsonb),
          deleted_exercices = COALESCE(p_deleted_exercices, '[]'::jsonb),
          source_fingerprint = p_source_fingerprint,
          updated_at = v_now
      WHERE s.module_id = p_module_id;
  ELSE
    INSERT INTO public.module_editor_state(
      module_id, module_data, deleted_cours, deleted_exercices,
      source_fingerprint, updated_at
    )
    VALUES (
      p_module_id, p_module_data,
      COALESCE(p_deleted_cours, '[]'::jsonb),
      COALESCE(p_deleted_exercices, '[]'::jsonb),
      p_source_fingerprint, v_now
    );
  END IF;

  RETURN QUERY SELECT CASE WHEN FOUND THEN v_now ELSE v_now END;
END;
$function$;