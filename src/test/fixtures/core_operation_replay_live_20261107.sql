CREATE OR REPLACE FUNCTION public.core_operation_replay(p_operation_id uuid, p_operation_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existante public.core_operations%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'OPERATION_ID_OBLIGATOIRE: toute ecriture doit porter un operation_id unique.'
      USING ERRCODE = 'P0482';
  END IF;

  SELECT * INTO existante FROM public.core_operations WHERE operation_id = p_operation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF existante.operation_type <> p_operation_type THEN
    RAISE EXCEPTION 'OPERATION_ID_REUTILISE: operation_id % deja utilise pour une operation de type %.',
      p_operation_id, existante.operation_type
      USING ERRCODE = 'P0482';
  END IF;

  RETURN jsonb_build_object('rejeu', true, 'resultat', existante.resultat);
END;
$function$

