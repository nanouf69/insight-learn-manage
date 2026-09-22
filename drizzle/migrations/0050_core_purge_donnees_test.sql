-- Nettoyage des données du PILOTE TEST uniquement.
-- Ne peut toucher que des tentatives explicitement marquées is_test = true.
-- Les protections append-only du noyau sont neutralisées le temps de la purge,
-- exactement comme lors du contrôle de sauvegarde/restauration.
CREATE OR REPLACE FUNCTION public.core_purge_donnees_test()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ids uuid[];
  n_att int := 0; n_rep int := 0; n_evt int := 0; n_qrc int := 0; n_cor int := 0; n_res int := 0; n_ver int := 0;
BEGIN
  SELECT coalesce(array_agg(attempt_id), '{}') INTO ids FROM public.exam_attempts_v2 WHERE is_test;

  ALTER TABLE public.answer_events DISABLE TRIGGER USER;
  ALTER TABLE public.answer_state DISABLE TRIGGER USER;
  ALTER TABLE public.qrc_instances_v2 DISABLE TRIGGER USER;
  ALTER TABLE public.qrc_correction_events DISABLE TRIGGER USER;
  ALTER TABLE public.exam_attempts_v2 DISABLE TRIGGER USER;
  ALTER TABLE public.exam_content_versions DISABLE TRIGGER USER;
  ALTER TABLE public.core_operations DISABLE TRIGGER USER;
  ALTER TABLE public.audit_journal DISABLE TRIGGER USER;

  DELETE FROM public.core_exam_results WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_res = ROW_COUNT;
  DELETE FROM public.qrc_correction_events WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_cor = ROW_COUNT;
  DELETE FROM public.qrc_instances_v2 WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_qrc = ROW_COUNT;
  DELETE FROM public.answer_events WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_evt = ROW_COUNT;
  DELETE FROM public.answer_state WHERE attempt_id = ANY(ids);
  GET DIAGNOSTICS n_rep = ROW_COUNT;
  DELETE FROM public.core_operations WHERE attempt_id = ANY(ids);
  DELETE FROM public.audit_journal WHERE attempt_id = ANY(ids);
  DELETE FROM public.exam_attempts_v2 WHERE is_test;
  GET DIAGNOSTICS n_att = ROW_COUNT;
  DELETE FROM public.exam_content_versions WHERE is_test;
  GET DIAGNOSTICS n_ver = ROW_COUNT;

  ALTER TABLE public.answer_events ENABLE TRIGGER USER;
  ALTER TABLE public.answer_state ENABLE TRIGGER USER;
  ALTER TABLE public.qrc_instances_v2 ENABLE TRIGGER USER;
  ALTER TABLE public.qrc_correction_events ENABLE TRIGGER USER;
  ALTER TABLE public.exam_attempts_v2 ENABLE TRIGGER USER;
  ALTER TABLE public.exam_content_versions ENABLE TRIGGER USER;
  ALTER TABLE public.core_operations ENABLE TRIGGER USER;
  ALTER TABLE public.audit_journal ENABLE TRIGGER USER;

  RETURN jsonb_build_object('tentatives', n_att, 'reponses', n_rep, 'evenements', n_evt,
                            'qrc', n_qrc, 'corrections', n_cor, 'resultats', n_res, 'versions', n_ver);
END;
$$;

REVOKE ALL ON FUNCTION public.core_purge_donnees_test() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.core_purge_donnees_test() TO service_role;

COMMENT ON FUNCTION public.core_purge_donnees_test() IS 'Purge exclusivement les données marquées is_test du pilote du noyau sécurisé. Aucune donnée réelle n''est concernée.';