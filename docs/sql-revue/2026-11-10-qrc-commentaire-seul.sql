-- Commentaire seul sur une QRC déjà corrigée (10/11/2026) — append-only, note/barème/réponse jamais modifiés.
-- V2 : nouvel événement qrc_correction_events (même état, même note) ; ancien circuit : nouvelle ligne
-- qrc_historique_corrections (même note) sans toucher apprenant_quiz_results. CAS + idempotence + admin.

CREATE OR REPLACE FUNCTION public.core_commenter_qrc(
  p_operation_id uuid, p_qrc_instance_id uuid, p_note_attendue numeric,
  p_dernier_evenement_attendu bigint, p_commentaire text, p_corrige_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_op public.core_operations%ROWTYPE;
  inst public.qrc_instances_v2%ROWTYPE;
  v_dernier public.qrc_correction_events%ROWTYPE;
  v_txt text := coalesce(p_commentaire, '');
  v_ev bigint;
  v_res jsonb;
BEGIN
  IF NOT public.core_contexte_correction_autorise() THEN
    RAISE EXCEPTION 'COMMENTAIRE_NON_AUTORISE: seul un administrateur peut commenter une correction.' USING ERRCODE = 'P0481';
  END IF;
  IF p_operation_id IS NULL OR p_qrc_instance_id IS NULL OR p_note_attendue IS NULL THEN
    RAISE EXCEPTION 'COMMENTAIRE_INCOMPLET: opération, QRC et note attendue requises.' USING ERRCODE = '22023';
  END IF;
  IF length(v_txt) > 4000 THEN
    RAISE EXCEPTION 'COMMENTAIRE_TROP_LONG: 4000 caractères maximum.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_op FROM public.core_operations WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_op.operation_type <> 'qrc_commentaire' OR v_op.cible->>'qrc_instance_id' <> p_qrc_instance_id::text
       OR v_op.resultat->>'commentaire' IS DISTINCT FROM v_txt THEN
      RAISE EXCEPTION 'COMMENTAIRE_OPERATION_CONFLIT: identifiant d''opération déjà utilisé pour une autre commande.' USING ERRCODE = 'P0484';
    END IF;
    RETURN v_op.resultat || jsonb_build_object('rejeu', true);
  END IF;

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QRC_INTROUVABLE: QRC % inexistante.', p_qrc_instance_id USING ERRCODE = 'P0476';
  END IF;
  -- Double clic simultané : le second appel attend le verrou puis rejoue l'opération déjà écrite.
  SELECT * INTO v_op FROM public.core_operations WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_op.operation_type <> 'qrc_commentaire' OR v_op.cible->>'qrc_instance_id' <> p_qrc_instance_id::text
       OR v_op.resultat->>'commentaire' IS DISTINCT FROM v_txt THEN
      RAISE EXCEPTION 'COMMENTAIRE_OPERATION_CONFLIT: identifiant d''opération déjà utilisé pour une autre commande.' USING ERRCODE = 'P0484';
    END IF;
    RETURN v_op.resultat || jsonb_build_object('rejeu', true);
  END IF;
  IF inst.etat <> 'corrigee' OR inst.note IS NULL THEN
    RAISE EXCEPTION 'QRC_NON_CORRIGEE: commentaire seul refusé, la QRC n''est pas corrigée.' USING ERRCODE = 'P0476';
  END IF;
  IF inst.note IS DISTINCT FROM p_note_attendue THEN
    RAISE EXCEPTION 'COMMENTAIRE_CONFLIT: la note a changé (% en base, % attendue). Rechargez.', inst.note, p_note_attendue USING ERRCODE = 'P0482';
  END IF;

  SELECT * INTO v_dernier FROM public.qrc_correction_events
   WHERE qrc_instance_id = p_qrc_instance_id
   ORDER BY created_at DESC, correction_event_id DESC LIMIT 1;
  IF v_dernier.correction_event_id IS DISTINCT FROM p_dernier_evenement_attendu THEN
    RAISE EXCEPTION 'COMMENTAIRE_CONFLIT: la correction a été modifiée entre-temps. Rechargez avant de commenter.' USING ERRCODE = 'P0482';
  END IF;
  IF v_dernier.correction_event_id IS NOT NULL AND v_dernier.note_nouvelle IS DISTINCT FROM inst.note THEN
    RAISE EXCEPTION 'COMMENTAIRE_JOURNAL_INCOHERENT: dernier événement différent de la note enregistrée.' USING ERRCODE = 'P0483';
  END IF;

  IF coalesce(v_dernier.commentaire, '') = v_txt THEN
    v_res := jsonb_build_object('qrc_instance_id', inst.qrc_instance_id, 'note', inst.note, 'etat', inst.etat,
      'correction_event_id', v_dernier.correction_event_id, 'commentaire', v_txt, 'commentaire_seul', true, 'inchange', true);
  ELSE
    INSERT INTO public.qrc_correction_events (
      qrc_instance_id, attempt_id, question_id, apprenant_id, etat_precedent, etat_nouveau,
      note_precedente, note_nouvelle, commentaire, corrige_par, corrige_email, operation_id)
    VALUES (inst.qrc_instance_id, inst.attempt_id, inst.question_id, inst.apprenant_id, inst.etat, inst.etat,
      inst.note, inst.note, nullif(v_txt, ''), auth.uid(), p_corrige_email, p_operation_id)
    RETURNING correction_event_id INTO v_ev;
    v_res := jsonb_build_object('qrc_instance_id', inst.qrc_instance_id, 'note', inst.note, 'etat', inst.etat,
      'correction_event_id', v_ev, 'commentaire', v_txt, 'commentaire_seul', true, 'inchange', false);
    INSERT INTO public.audit_journal (operation, cible_type, cible_id, attempt_id, apprenant_id, auteur, auteur_email, avant, apres, origine)
    VALUES ('qrc_commentaire_seul', 'qrc_instances_v2', p_qrc_instance_id::text, inst.attempt_id, inst.apprenant_id,
      auth.uid(), p_corrige_email,
      jsonb_build_object('note', inst.note, 'commentaire', v_dernier.commentaire, 'correction_event_id', v_dernier.correction_event_id, 'question_id', inst.question_id),
      jsonb_build_object('note', inst.note, 'commentaire', nullif(v_txt, ''), 'correction_event_id', v_ev, 'question_id', inst.question_id),
      'core_commenter_qrc');
  END IF;

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'qrc_commentaire', inst.apprenant_id, inst.attempt_id, auth.uid(),
    jsonb_build_object('qrc_instance_id', p_qrc_instance_id, 'question_id', inst.question_id), v_res);
  RETURN v_res || jsonb_build_object('rejeu', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.core_commenter_qrc(uuid, uuid, numeric, bigint, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.core_commenter_qrc(uuid, uuid, numeric, bigint, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.core_commenter_qrc(uuid, uuid, numeric, bigint, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.qrc_historique_commenter(
  p_operation_id text, p_result_id uuid, p_question_id text, p_note_attendue numeric,
  p_revision_attendue integer, p_commentaire text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_prior public.qrc_historique_corrections;
  v_dernier public.qrc_historique_corrections;
  r public.apprenant_quiz_results;
  v_txt text := coalesce(p_commentaire, '');
  v_snap jsonb; v_q jsonb; v_bareme numeric; v_prev jsonb; v_exo text; v_prov text; v_rev integer;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Administrateur requis' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(coalesce(p_operation_id,'')),'') IS NULL OR p_result_id IS NULL
     OR nullif(btrim(coalesce(p_question_id,'')),'') IS NULL OR p_note_attendue IS NULL OR p_revision_attendue IS NULL THEN
    RAISE EXCEPTION 'Commande de commentaire incomplète' USING ERRCODE = '22023';
  END IF;
  IF length(v_txt) > 4000 THEN RAISE EXCEPTION 'Commentaire trop long (4000 caractères maximum)' USING ERRCODE = '22023'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('qrchist:op:' || p_operation_id, 0));
  SELECT * INTO v_prior FROM public.qrc_historique_corrections WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_prior.result_id <> p_result_id OR v_prior.question_id <> p_question_id OR v_prior.acteur <> v_uid
       OR v_prior.commentaire <> v_txt OR v_prior.note <> p_note_attendue THEN
      RAISE EXCEPTION 'Conflit d''opération' USING ERRCODE = 'P0409';
    END IF;
    RETURN to_jsonb(v_prior) || jsonb_build_object('rejeu', true, 'commentaire_seul', true);
  END IF;

  SELECT * INTO r FROM public.apprenant_quiz_results WHERE id = p_result_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Copie introuvable' USING ERRCODE = 'P0002'; END IF;
  IF r.quiz_type IS DISTINCT FROM 'examen_blanc' OR r.quiz_id !~ '^EB[1-6](-TAXI)?$' OR r.completed_at IS NULL THEN
    RAISE EXCEPTION 'Copie hors périmètre (examen blanc terminé requis)' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id = r.apprenant_id
       AND (a.snapshot->'source_historique'->>'result_id' = r.id::text OR a.snapshot->>'result_id' = r.id::text)) THEN
    RAISE EXCEPTION 'Copie déjà liée au moteur V2 : corriger la fiche V2' USING ERRCODE = 'P0001';
  END IF;
  v_snap := r.details->'snapshot'->'questions';
  IF jsonb_typeof(v_snap) IS DISTINCT FROM 'array'
     OR (SELECT count(*) FROM jsonb_array_elements(v_snap) x WHERE x->>'id' = p_question_id) <> 1 THEN
    RAISE EXCEPTION 'Identité de question absente ou ambiguë' USING ERRCODE = 'P0001';
  END IF;
  SELECT x INTO v_q FROM jsonb_array_elements(v_snap) x WHERE x->>'id' = p_question_id;
  IF upper(coalesce(v_q->>'type','')) <> 'QRC' OR jsonb_typeof(v_q->'points') IS DISTINCT FROM 'number' OR (v_q->>'points')::numeric <= 0 THEN
    RAISE EXCEPTION 'Question non QRC ou barème figé absent' USING ERRCODE = 'P0001';
  END IF;
  v_bareme := (v_q->>'points')::numeric;
  v_prev := r.details->'correctionsIA'->p_question_id;
  IF NOT coalesce(public.qrc_historique_valide(v_prev), false) OR jsonb_typeof(v_prev->'pointsObtenus') IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'QRC non corrigée : commentaire seul refusé' USING ERRCODE = 'P0001';
  END IF;
  IF (v_prev->>'pointsObtenus')::numeric <> p_note_attendue THEN
    RAISE EXCEPTION 'Note modifiée depuis l''affichage : recharger' USING ERRCODE = 'P0409';
  END IF;

  SELECT * INTO v_dernier FROM public.qrc_historique_corrections j
   WHERE j.result_id = r.id AND j.question_id = p_question_id ORDER BY j.revision DESC LIMIT 1;
  v_rev := coalesce(v_dernier.revision, 0);
  IF v_rev <> p_revision_attendue THEN
    RAISE EXCEPTION 'Correction modifiée depuis l''affichage : recharger' USING ERRCODE = 'P0409';
  END IF;
  IF v_dernier.id IS NOT NULL AND v_dernier.note <> p_note_attendue THEN
    RAISE EXCEPTION 'Journal incohérent avec la note enregistrée : commentaire refusé' USING ERRCODE = 'P0001';
  END IF;
  IF v_dernier.id IS NOT NULL AND v_dernier.commentaire = v_txt THEN
    RETURN to_jsonb(v_dernier) || jsonb_build_object('rejeu', false, 'commentaire_seul', true, 'inchange', true);
  END IF;

  -- Provenance re-vérifiée en direct, comme pour toute révision.
  v_exo := 'EB' || substring(r.quiz_id from '^EB([1-6])') || '__' || coalesce(r.matiere_id,'')
           || CASE WHEN coalesce(r.tentative,1) <= 1 THEN '' ELSE '__t' || r.tentative END;
  IF r.quiz_id LIKE '%-TAXI' THEN v_exo := NULL; END IF;
  SELECT CASE WHEN count(*) = 0 THEN NULL WHEN bool_or(a.submitted_at = r.completed_at) THEN 'remise_identique' ELSE 'remise_horodatage_divergent' END
    INTO v_prov
  FROM public.reponses_apprenants a
  WHERE v_exo IS NOT NULL AND a.apprenant_id = r.apprenant_id AND a.exercice_id = v_exo
    AND coalesce(a.tentative,1) = coalesce(r.tentative,1) AND a.completed IS TRUE AND a.status = 'submitted'
    AND a.submitted_at IS NOT NULL AND public.qrc_historique_reponses_identiques(r.details, a.reponses);
  v_prov := coalesce(v_prov, 'resultat_seul');
  IF v_prov = 'resultat_seul' AND public.qrc_historique_liaison_prouvee(r.id) THEN v_prov := 'liaison_prouvee'; END IF;
  IF v_prov = 'resultat_seul' AND v_dernier.id IS NULL THEN
    RAISE EXCEPTION 'Remise non prouvée : commentaire seul refusé' USING ERRCODE = 'P0001';
  END IF;
  IF v_prov = 'resultat_seul' THEN v_prov := v_dernier.provenance; END IF;

  INSERT INTO public.qrc_historique_corrections(operation_id, result_id, apprenant_id, quiz_id, matiere_id, tentative,
    question_id, note, bareme, commentaire, provenance, reconnaissance, correction_precedente, revision, note_precedente,
    score_avant, score_apres, note20_avant, note20_apres, reussi_avant, reussi_apres, acteur)
  VALUES (p_operation_id, r.id, r.apprenant_id, r.quiz_id, r.matiere_id, r.tentative,
    p_question_id, p_note_attendue, v_bareme, v_txt, v_prov, v_dernier.reconnaissance, v_prev, v_rev + 1, p_note_attendue,
    r.score_obtenu, r.score_obtenu, r.note_sur_20, r.note_sur_20, r.reussi, r.reussi, v_uid)
  RETURNING * INTO v_prior;
  RETURN to_jsonb(v_prior) || jsonb_build_object('rejeu', false, 'commentaire_seul', true, 'inchange', false);
END $function$;

REVOKE ALL ON FUNCTION public.qrc_historique_commenter(text, uuid, text, numeric, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qrc_historique_commenter(text, uuid, text, numeric, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.qrc_historique_commenter(text, uuid, text, numeric, integer, text) TO authenticated, service_role;

-- Lecture candidat : dernière ligne du journal par question, uniquement pour ses propres copies.
CREATE OR REPLACE FUNCTION public.qrc_historique_commentaires_eleve(p_result_ids uuid[])
RETURNS TABLE(result_id uuid, question_id text, note numeric, commentaire text, revision integer, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
  IF coalesce(array_length(p_result_ids, 1), 0) > 200 THEN RAISE EXCEPTION 'Trop de copies demandées' USING ERRCODE = '22023'; END IF;
  RETURN QUERY
  SELECT DISTINCT ON (j.result_id, j.question_id) j.result_id, j.question_id, j.note, j.commentaire, j.revision, j.created_at
  FROM public.qrc_historique_corrections j
  JOIN public.apprenant_quiz_results r ON r.id = j.result_id AND r.apprenant_id = j.apprenant_id
  WHERE j.result_id = ANY(coalesce(p_result_ids, '{}'::uuid[]))
    AND (public.has_role(auth.uid(), 'admin') OR public.core_est_proprietaire(r.apprenant_id))
  ORDER BY j.result_id, j.question_id, j.revision DESC;
END $function$;

REVOKE ALL ON FUNCTION public.qrc_historique_commentaires_eleve(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qrc_historique_commentaires_eleve(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.qrc_historique_commentaires_eleve(uuid[]) TO authenticated, service_role;
