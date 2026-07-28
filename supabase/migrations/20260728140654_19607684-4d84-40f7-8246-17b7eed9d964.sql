
CREATE OR REPLACE FUNCTION public.save_module_editor_state(
  p_module_id integer,
  p_module_data jsonb,
  p_deleted_cours jsonb,
  p_deleted_exercices jsonb,
  p_source_fingerprint text,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS TABLE(updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current timestamptz;
  v_now timestamptz := now();
BEGIN
  SELECT s.updated_at INTO v_current
  FROM public.module_editor_state s
  WHERE s.module_id = p_module_id
  FOR UPDATE;

  -- Compare-and-swap: refuse une écriture si la version en base est plus récente
  -- que celle qu'a lue le client. Cela bloque les onglets admin restés ouverts
  -- avec un ancien snapshot qui écraseraient les corrections récentes.
  IF v_current IS NOT NULL
     AND p_expected_updated_at IS NOT NULL
     AND v_current > (p_expected_updated_at + interval '1 millisecond') THEN
    RAISE EXCEPTION 'stale_module_editor_state_write: module_id=% expected=% actual=%',
      p_module_id, p_expected_updated_at, v_current
      USING ERRCODE = 'P0409',
            HINT = 'Recharger le module pour récupérer la dernière version avant de réenregistrer.';
  END IF;

  INSERT INTO public.module_editor_state(
    module_id, module_data, deleted_cours, deleted_exercices,
    source_fingerprint, updated_at
  )
  VALUES (
    p_module_id, p_module_data,
    COALESCE(p_deleted_cours, '[]'::jsonb),
    COALESCE(p_deleted_exercices, '[]'::jsonb),
    p_source_fingerprint, v_now
  )
  ON CONFLICT (module_id) DO UPDATE
    SET module_data = EXCLUDED.module_data,
        deleted_cours = EXCLUDED.deleted_cours,
        deleted_exercices = EXCLUDED.deleted_exercices,
        source_fingerprint = EXCLUDED.source_fingerprint,
        updated_at = v_now;

  RETURN QUERY SELECT v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.save_module_editor_state(integer, jsonb, jsonb, jsonb, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_module_editor_state(integer, jsonb, jsonb, jsonb, text, timestamptz) TO authenticated, service_role;
