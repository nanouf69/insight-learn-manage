CREATE OR REPLACE FUNCTION public.core_correct_qrc_publish(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rejoue jsonb;
  inst public.qrc_instances_v2;
  res public.core_exam_results;
BEGIN
  SELECT resultat INTO rejoue FROM public.core_operations WHERE operation_id = p_operation_id;
  IF rejoue IS NOT NULL THEN
    RETURN rejoue;  -- idempotence : double-clic, F5, retry réseau
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'CORRECTION_NON_AUTORISEE: seul un administrateur peut corriger une QRC.'
      USING ERRCODE = 'P0481';
  END IF;

  PERFORM public.core_correct_qrc(p_operation_id, p_qrc_instance_id, p_note, p_commentaire, p_corrige_email);

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id;
  res := public.core_recalc_result(inst.attempt_id);

  RETURN jsonb_build_object(
    'qrc_instance_id', inst.qrc_instance_id,
    'etat', inst.etat,
    'note', inst.note,
    'result_id', res.result_id,
    'result_revision', res.result_revision,
    'status', res.status,
    'score', res.score,
    'qrc_restantes', res.qrc_restantes
  );
END;
$function$

