CREATE OR REPLACE FUNCTION public.bilan_demarrer_passage(
  p_apprenant_id uuid, p_module_id int, p_exercice_id int, p_tentative int, p_operation_id uuid DEFAULT NULL)
RETURNS public.bilan_passage_snapshots
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.bilan_passage_snapshots; v_exo jsonb; v_qs jsonb;
BEGIN
  IF p_module_id NOT IN (5, 11) AND current_setting('app.bilan_snapshot_test', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Module non concerné par les snapshots Bilan' USING ERRCODE = 'P0492';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NOT public.is_current_user_apprenant(p_apprenant_id) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE((SELECT actif FROM bilan_snapshot_flags WHERE module_id = p_module_id), false) THEN
    RAISE EXCEPTION 'Snapshots Bilan non activés pour ce module' USING ERRCODE = 'P0493';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_apprenant_id::text||':'||p_module_id||':'||p_exercice_id||':'||p_tentative, 0));
  SELECT * INTO s FROM bilan_passage_snapshots
   WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative = p_tentative;
  IF FOUND THEN RETURN s; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO s FROM bilan_passage_snapshots WHERE operation_id = p_operation_id;
    IF FOUND THEN RETURN s; END IF;
  END IF;
  SELECT e INTO v_exo FROM module_editor_state m, jsonb_array_elements(m.module_data->'exercices') e
   WHERE m.module_id = p_module_id AND (e->>'id')::int = p_exercice_id;
  IF v_exo IS NULL THEN RAISE EXCEPTION 'Matière introuvable' USING ERRCODE = 'P0494'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'position', o, 'uid', q->>'uid', 'question_id', q->>'id', 'cle', p_exercice_id||'-'||(q->>'id'),
      'type', q->>'type', 'enonce', q->'enonce', 'choix', COALESCE(q->'choix','[]'::jsonb),
      'image', COALESCE(q->'image', q->'imageUrl', q->'image_url'),
      'reponseQRC', q->'reponseQRC', 'reponses_possibles', q->'reponses_possibles',
      'bareme', q->'bareme', 'question_source', q) ORDER BY o), '[]'::jsonb)
    INTO v_qs FROM jsonb_array_elements(COALESCE(v_exo->'questions','[]'::jsonb)) WITH ORDINALITY x(q, o);
  IF jsonb_array_length(v_qs) = 0 THEN RAISE EXCEPTION 'Matière sans question' USING ERRCODE = 'P0495'; END IF;
  IF COALESCE((SELECT actif FROM bilan_identite_flags WHERE module_id = p_module_id), false)
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_qs) z WHERE z->>'uid' IS NULL) THEN
    RAISE EXCEPTION 'Snapshot refusé : question sans identifiant permanent' USING ERRCODE = 'P0498';
  END IF;
  INSERT INTO bilan_passage_snapshots(apprenant_id, module_id, exercice_id, filiere, matiere, tentative, passage_cle,
     questions, nb_questions, bareme, empreinte, empreinte_source, operation_id)
  VALUES (p_apprenant_id, p_module_id, p_exercice_id,
     CASE p_module_id WHEN 5 THEN 'VTC' WHEN 11 THEN 'TAXI' ELSE 'TEST' END,
     COALESCE(v_exo->>'titre',''), p_tentative, 'module_'||p_module_id||'_exo_'||p_exercice_id,
     v_qs, jsonb_array_length(v_qs), v_exo->'bareme', md5(v_qs::text), md5(v_exo::text), p_operation_id)
  RETURNING * INTO s;
  RETURN s;
END $$;