-- RETOUR ARRIÈRE DE PUBLICATION (additif, réversible, sans effet sur les données pédagogiques)
-- Retire la version active d'un examen dans le noyau V2 : les NOUVEAUX passages
-- repartent alors sur l'ancien circuit. Aucune tentative, réponse, correction,
-- note ni contenu n'est modifié ou supprimé. Journalisé.
CREATE OR REPLACE FUNCTION public.core_retirer_version_examen(
  p_operation_id uuid,
  p_exam_id text,
  p_motif text DEFAULT NULL
)
RETURNS public.exam_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rejeu jsonb;
  v_active public.exam_content_versions;
  v_row public.exam_content_versions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'RETRAIT_REFUSE: action reservee a un administrateur.' USING ERRCODE = 'P0481';
  END IF;

  rejeu := public.core_operation_replay(p_operation_id, 'exam_version_retirer');
  IF rejeu IS NOT NULL THEN
    SELECT * INTO v_row FROM public.exam_content_versions WHERE id = (rejeu #>> '{resultat,version_id}')::uuid;
    RETURN v_row;
  END IF;

  SELECT * INTO v_active FROM public.exam_content_versions
   WHERE exam_id = p_exam_id AND statut = 'publiee' AND retired_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUCUNE_VERSION_ACTIVE: rien a retirer pour %.', p_exam_id USING ERRCODE = 'P0483';
  END IF;

  UPDATE public.exam_content_versions
     SET statut = 'retiree', retired_at = now()
   WHERE id = v_active.id
  RETURNING * INTO v_row;

  INSERT INTO public.core_operations (operation_id, operation_type, auteur, cible, resultat)
  VALUES (p_operation_id, 'exam_version_retirer', auth.uid(),
          jsonb_build_object('exam_id', p_exam_id),
          jsonb_build_object('version_id', v_row.id, 'version_number', v_row.version_number));

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, auteur, apres, origine)
  VALUES ('exam_version_retire', 'exam_content_versions', v_row.id::text, p_exam_id, v_row.id, auth.uid(),
          jsonb_build_object('version_number', v_row.version_number, 'motif', p_motif),
          'core_retirer_version_examen');

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.core_retirer_version_examen(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.core_retirer_version_examen(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.core_retirer_version_examen(uuid, text, text) TO service_role;