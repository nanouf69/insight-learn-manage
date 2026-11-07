CREATE OR REPLACE FUNCTION public.core_correct_qrc(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rejeu jsonb;
  inst public.qrc_instances_v2%ROWTYPE;
  resultat jsonb;
BEGIN
  rejeu := public.core_operation_replay(p_operation_id, 'qrc_correction');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QRC_INTROUVABLE: QRC % inexistante.', p_qrc_instance_id USING ERRCODE = 'P0476';
  END IF;

  IF inst.etat = 'corrigee' THEN
    RAISE EXCEPTION 'QRC_DEJA_CORRIGEE: la QRC % est deja corrigee (correction definitive).', p_qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  PERFORM set_config('core.qrc_commentaire', coalesce(p_commentaire, ''), true);
  PERFORM set_config('core.qrc_operation_id', p_operation_id::text, true);

  UPDATE public.qrc_instances_v2
  SET etat = 'corrigee', note = p_note, corrige_par = auth.uid(), corrige_email = p_corrige_email, corrige_at = now()
  WHERE qrc_instance_id = p_qrc_instance_id
  RETURNING * INTO inst;

  PERFORM set_config('core.qrc_commentaire', '', true);
  PERFORM set_config('core.qrc_operation_id', '', true);

  resultat := jsonb_build_object('qrc_instance_id', p_qrc_instance_id, 'etat', inst.etat, 'note', inst.note);

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'qrc_correction', inst.apprenant_id, inst.attempt_id, auth.uid(),
          jsonb_build_object('qrc_instance_id', p_qrc_instance_id), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, attempt_id, apprenant_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('qrc_correction', 'qrc_instances_v2', p_qrc_instance_id::text, inst.attempt_id, inst.apprenant_id, auth.uid(), p_corrige_email,
          jsonb_build_object('etat', 'en_attente'), resultat, 'core_correct_qrc');

  RETURN resultat;
END;
$function$

