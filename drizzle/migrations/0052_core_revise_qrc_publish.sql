-- Révision volontaire et tracée d'une correction QRC déjà validée.
-- La correction précédente N'EST JAMAIS supprimée : l'historique reste dans
-- qrc_correction_events (note_precedente -> note_nouvelle) et audit_journal.
-- La réponse de l'élève et le snapshot ne sont jamais touchés.
CREATE OR REPLACE FUNCTION public.core_revise_qrc_publish(
  p_operation_id uuid,
  p_qrc_instance_id uuid,
  p_note numeric,
  p_note_attendue numeric,
  p_commentaire text DEFAULT NULL,
  p_corrige_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rejoue jsonb;
  inst public.qrc_instances_v2%ROWTYPE;
  ancienne numeric;
  res public.core_exam_results;
  resultat jsonb;
BEGIN
  -- idempotence : double-clic, retry réseau, F5 => une seule révision
  SELECT resultat INTO rejoue FROM public.core_operations WHERE operation_id = p_operation_id;
  IF rejoue IS NOT NULL THEN
    RETURN rejoue;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'REVISION_NON_AUTORISEE: seul un administrateur peut réviser une correction.'
      USING ERRCODE = 'P0481';
  END IF;

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QRC_INTROUVABLE: QRC % inexistante.', p_qrc_instance_id USING ERRCODE = 'P0476';
  END IF;

  IF inst.etat <> 'corrigee' THEN
    RAISE EXCEPTION 'QRC_NON_CORRIGEE: la QRC % n''est pas corrigée : utiliser la correction normale.', p_qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  ancienne := inst.note;

  -- contrôle de concurrence : deux correcteurs simultanés => aucun écrasement silencieux
  IF ancienne IS DISTINCT FROM p_note_attendue THEN
    RAISE EXCEPTION 'REVISION_CONFLIT: la note a été modifiée entre-temps (% en base, % attendue). Rechargez avant de réviser.',
      ancienne, p_note_attendue USING ERRCODE = 'P0482';
  END IF;

  PERFORM set_config('core.qrc_commentaire', coalesce(p_commentaire, ''), true);
  PERFORM set_config('core.qrc_operation_id', p_operation_id::text, true);

  UPDATE public.qrc_instances_v2
  SET note = p_note, corrige_par = auth.uid(), corrige_email = p_corrige_email, corrige_at = now()
  WHERE qrc_instance_id = p_qrc_instance_id
  RETURNING * INTO inst;

  PERFORM set_config('core.qrc_commentaire', '', true);
  PERFORM set_config('core.qrc_operation_id', '', true);

  res := public.core_recalc_result(inst.attempt_id);

  resultat := jsonb_build_object(
    'qrc_instance_id', inst.qrc_instance_id,
    'etat', inst.etat,
    'note_precedente', ancienne,
    'note', inst.note,
    'result_id', res.result_id,
    'result_revision', res.result_revision,
    'status', res.status,
    'score', res.score,
    'qrc_restantes', res.qrc_restantes
  );

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'qrc_revision', inst.apprenant_id, inst.attempt_id, auth.uid(),
          jsonb_build_object('qrc_instance_id', p_qrc_instance_id), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, attempt_id, apprenant_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('qrc_correction_revision', 'qrc_instances_v2', p_qrc_instance_id::text, inst.attempt_id, inst.apprenant_id,
          auth.uid(), p_corrige_email,
          jsonb_build_object('note', ancienne), jsonb_build_object('note', inst.note),
          'core_revise_qrc_publish');

  RETURN resultat;
END;
$function$;

REVOKE ALL ON FUNCTION public.core_revise_qrc_publish(uuid, uuid, numeric, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.core_revise_qrc_publish(uuid, uuid, numeric, numeric, text, text) TO authenticated, service_role;