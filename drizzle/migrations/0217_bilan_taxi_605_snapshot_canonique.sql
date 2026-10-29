-- Identités permanentes additives pour les 9 QCM ajoutés (numéro = identifiant existant, comme les 88 précédents)
INSERT INTO public.bilan_question_identites(module_id, filiere, exercice_id, matiere, numero_technique, empreinte_contenu, etat_initial, date_connue)
SELECT 11, 'TAXI', 605, 'Réglementation nationale', c.legacy_question_id::text, md5(c.enonce || c.choix::text), 'actif', now()
FROM public.quiz_questions c
WHERE c.quiz_id = 'bilan-examen-taxi' AND c.section_id = 605 AND c.active AND c.legacy_question_id BETWEEN 89 AND 97
  AND NOT EXISTS (SELECT 1 FROM public.bilan_question_identites i WHERE i.module_id = 11 AND i.exercice_id = 605 AND i.numero_technique = c.legacy_question_id::text);

INSERT INTO public.bilan_question_identite_etats(uid, etat, numero_affiche, empreinte_contenu, motif)
SELECT i.uid, 'actif', i.numero_technique, i.empreinte_contenu, 'création QCM national 29/10'
FROM public.bilan_question_identites i
WHERE i.module_id = 11 AND i.exercice_id = 605 AND i.numero_technique IN ('89','90','91','92','93','94','95','96','97')
  AND NOT EXISTS (SELECT 1 FROM public.bilan_question_identite_etats e WHERE e.uid = i.uid);

CREATE OR REPLACE FUNCTION public.bilan_demarrer_passage(p_apprenant_id uuid, p_module_id integer, p_exercice_id integer, p_tentative integer, p_operation_id uuid DEFAULT NULL::uuid)
 RETURNS bilan_passage_snapshots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.bilan_passage_snapshots; v_exo jsonb; v_qs jsonb; v_can jsonb;
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
  IF EXISTS (SELECT 1 FROM bilan_passage_categories WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative = p_tentative AND categorie IN ('HISTORIQUE','ROUGE')) THEN
    RAISE EXCEPTION 'Passage historique conservé : aucun snapshot' USING ERRCODE = 'P0499';
  END IF;
  IF EXISTS (SELECT 1 FROM bilan_passage_categories WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative < p_tentative AND categorie = 'ROUGE')
     AND NOT EXISTS (SELECT 1 FROM bilan_nouvelle_tentative_autorisations WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative_autorisee = p_tentative) THEN
    RAISE EXCEPTION 'Nouvelle tentative non autorisée par l''Admin' USING ERRCODE = 'P0499';
  END IF;
  SELECT e INTO v_exo FROM module_editor_state m, jsonb_array_elements(m.module_data->'exercices') e
   WHERE m.module_id = p_module_id AND (e->>'id')::int = p_exercice_id;
  IF v_exo IS NULL THEN RAISE EXCEPTION 'Matière introuvable' USING ERRCODE = 'P0494'; END IF;
  -- TAXI Réglementation nationale (partagée TA) : futurs passages figés sur les questions actives canoniques
  IF p_module_id = 11 AND p_exercice_id = 605 THEN
    SELECT jsonb_agg(
             COALESCE(j.q, '{}'::jsonb)
             || jsonb_build_object('id', c.legacy_question_id, 'uid', i.uid::text, 'enonce', c.enonce,
                                   'choix', c.choix, 'question_id', c.question_id::text)
             || CASE WHEN c.explication IS NOT NULL THEN jsonb_build_object('explication', c.explication) ELSE '{}'::jsonb END
             || CASE WHEN c.image IS NOT NULL THEN jsonb_build_object('image', c.image) ELSE '{}'::jsonb END
             ORDER BY c.position, c.legacy_question_id)
      INTO v_can
      FROM quiz_questions c
      LEFT JOIN bilan_question_identites i ON i.module_id = 11 AND i.exercice_id = 605 AND i.numero_technique = c.legacy_question_id::text
      LEFT JOIN LATERAL (SELECT q FROM jsonb_array_elements(COALESCE(v_exo->'questions','[]'::jsonb)) q
                          WHERE q->>'id' = c.legacy_question_id::text LIMIT 1) j ON true
     WHERE c.quiz_id = 'bilan-examen-taxi' AND c.section_id = 605 AND c.active;
    IF v_can IS NOT NULL AND jsonb_array_length(v_can) > 0 THEN
      v_exo := jsonb_set(v_exo, '{questions}', v_can);
    END IF;
  END IF;
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
END $function$;