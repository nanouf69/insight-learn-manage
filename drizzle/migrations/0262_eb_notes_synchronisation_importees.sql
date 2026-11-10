CREATE OR REPLACE FUNCTION public.eb_notes_diagnostic(p_apres uuid DEFAULT NULL, p_limite integer DEFAULT 300, p_attempt_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  a record;
  n record;
  res public.core_exam_results;
  v_lim integer := least(greatest(coalesce(p_limite, 300), 1), 500);
  v_lignes jsonb := '[]'::jsonb;
  v_scan integer := 0;
  v_terminees integer := 0;
  v_en_cours integer := 0;
  v_dernier uuid;
  v_id_ko integer;
  v_type text;
  v_reparable boolean;
  v_sans_bareme boolean;
  v_importees integer := 0;
BEGIN
  IF NOT public.core_contexte_correction_autorise() THEN
    RAISE EXCEPTION 'DIAGNOSTIC_NON_AUTORISE: administrateur requis.' USING ERRCODE = '42501';
  END IF;

  FOR a IN
    SELECT t.attempt_id, t.apprenant_id, t.exam_id, t.snapshot, t.finished_at, t.etat, ap.nom, ap.prenom
    FROM public.exam_attempts_v2 t
    LEFT JOIN public.apprenants ap ON ap.id = t.apprenant_id
    WHERE NOT coalesce(t.is_test, false)
      AND (p_attempt_id IS NULL OR t.attempt_id = p_attempt_id)
      AND (p_apres IS NULL OR t.attempt_id > p_apres)
    ORDER BY t.attempt_id
    LIMIT v_lim
  LOOP
    v_scan := v_scan + 1;
    v_dernier := a.attempt_id;
    IF a.etat IS DISTINCT FROM 'terminee' THEN
      IF a.etat = 'en_cours' THEN v_en_cours := v_en_cours + 1; END IF;
      CONTINUE;  -- copie en cours ou abandonnée : jamais touchée
    END IF;
    v_terminees := v_terminees + 1;

    SELECT count(*) INTO v_id_ko
    FROM public.qrc_instances_v2 q
    WHERE q.attempt_id = a.attempt_id
      AND (q.apprenant_id IS DISTINCT FROM a.apprenant_id
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(a.snapshot->'questions', '[]'::jsonb)) x
                          WHERE x->>'id' = q.question_id AND upper(coalesce(x->>'type', '')) = 'QRC'));

    res := NULL;
    SELECT * INTO res FROM public.core_exam_results r WHERE r.attempt_id = a.attempt_id;
    SELECT * INTO n FROM public.core_note_attempt(a.attempt_id);

    v_type := NULL;
    v_reparable := false;
    v_sans_bareme := (a.snapshot ? 'source_historique') AND coalesce(n.total, 0) = 0;
    IF v_sans_bareme THEN v_importees := v_importees + 1; END IF;
    IF v_id_ko > 0 THEN
      v_type := 'identite_incoherente';
    ELSIF v_sans_bareme THEN
      -- Copie importée sans barème figé : note de l'ancien circuit conservée, jamais recalculée ici.
      IF n.qrc_restantes > 0 THEN v_type := 'importee_sans_bareme_qrc_restantes';
      ELSIF res.result_id IS NULL OR res.score IS NULL THEN v_type := 'importee_note_absente';
      END IF;
    ELSIF res.result_id IS NULL THEN
      v_type := 'resultat_manquant'; v_reparable := true;
    ELSIF res.score IS DISTINCT FROM n.score20 THEN
      v_type := 'note_divergente';  -- jamais réparée automatiquement
    ELSIF res.status = 'provisoire' AND n.qrc_restantes = 0 THEN
      v_type := 'attente_fantome'; v_reparable := true;
    ELSIF res.status = 'definitif' AND n.qrc_restantes > 0 THEN
      v_type := 'definitif_avec_qrc_restantes'; v_reparable := true;
    ELSIF res.qrc_restantes IS DISTINCT FROM n.qrc_restantes OR res.status NOT IN ('provisoire', 'definitif') THEN
      v_type := 'compteur_divergent'; v_reparable := true;
    ELSIF n.qrc_restantes > 0 THEN
      v_type := 'qrc_non_corrigee';  -- attente légitime
    END IF;

    IF v_type IS NOT NULL THEN
      v_lignes := v_lignes || jsonb_build_object(
        'attempt_id', a.attempt_id, 'apprenant_id', a.apprenant_id,
        'nom', a.nom, 'prenom', a.prenom, 'exam_id', a.exam_id,
        'matiere', a.snapshot->>'matiere',
        'titre', a.snapshot->'matieres'->0->>'titre',
        'finished_at', a.finished_at,
        'type', v_type, 'reparable', v_reparable,
        'result_revision', res.result_revision,
        'stocke', CASE WHEN res.result_id IS NULL THEN NULL ELSE jsonb_build_object('status', res.status, 'score', res.score, 'qrc_restantes', res.qrc_restantes) END,
        'attendu', jsonb_build_object('status', CASE WHEN n.qrc_restantes = 0 THEN 'definitif' ELSE 'provisoire' END, 'score', n.score20, 'qrc_restantes', n.qrc_restantes),
        'identite_ko', v_id_ko);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('scannees', v_scan, 'terminees', v_terminees, 'en_cours', v_en_cours, 'importees_sans_bareme', v_importees,
    'suivant', CASE WHEN v_scan = v_lim AND p_attempt_id IS NULL THEN v_dernier END,
    'lignes', v_lignes, 'lu_a', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.eb_notes_actualiser(p_operation_id uuid, p_attempt_id uuid, p_revision_attendue integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  att public.exam_attempts_v2;
  res public.core_exam_results;
  apres public.core_exam_results;
  n record;
  v_rejoue jsonb;
  v_id_ko integer;
  v_avant jsonb;
  v_retour jsonb;
  v_statut_attendu text;
BEGIN
  IF NOT public.core_contexte_correction_autorise() THEN
    RAISE EXCEPTION 'ACTUALISATION_NON_AUTORISEE: administrateur requis.' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Commande incomplète' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Copie introuvable' USING ERRCODE = 'P0002'; END IF;

  -- Rejeu (double clic, réseau) lu après le verrou : un seul résultat pour une même opération.
  SELECT s.apres || jsonb_build_object('rejoue', true) INTO v_rejoue
  FROM public.eb_notes_synchronisations s WHERE s.operation_id = p_operation_id;
  IF v_rejoue IS NOT NULL THEN
    IF (v_rejoue->>'attempt_id')::uuid IS DISTINCT FROM p_attempt_id THEN
      RAISE EXCEPTION 'Conflit d''opération' USING ERRCODE = 'P0409';
    END IF;
    RETURN v_rejoue;
  END IF;

  IF att.etat IS DISTINCT FROM 'terminee' THEN
    RAISE EXCEPTION 'COPIE_NON_TERMINEE: copie en cours ou abandonnée, jamais actualisée.' USING ERRCODE = 'P0561';
  END IF;

  SELECT count(*) INTO v_id_ko
  FROM public.qrc_instances_v2 q
  WHERE q.attempt_id = att.attempt_id
    AND (q.apprenant_id IS DISTINCT FROM att.apprenant_id
         OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(att.snapshot->'questions', '[]'::jsonb)) x
                        WHERE x->>'id' = q.question_id AND upper(coalesce(x->>'type', '')) = 'QRC'));
  IF v_id_ko > 0 THEN
    RAISE EXCEPTION 'IDENTITE_INCOHERENTE: QRC rattachée à un autre élève ou absente du sujet figé.' USING ERRCODE = 'P0562';
  END IF;

  res := NULL;
  SELECT * INTO res FROM public.core_exam_results WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF res.result_id IS NULL THEN
    IF p_revision_attendue IS NOT NULL THEN
      RAISE EXCEPTION 'Résultat modifié depuis la lecture : relancer la vérification' USING ERRCODE = 'P0409';
    END IF;
  ELSIF p_revision_attendue IS DISTINCT FROM res.result_revision THEN
    RAISE EXCEPTION 'Résultat modifié depuis la lecture : relancer la vérification' USING ERRCODE = 'P0409';
  END IF;

  SELECT * INTO n FROM public.core_note_attempt(p_attempt_id);
  IF (att.snapshot ? 'source_historique') AND coalesce(n.total, 0) = 0 THEN
    RAISE EXCEPTION 'IMPORTEE_SANS_BAREME: copie importée sans barème figé ; note de l''ancien circuit conservée, aucun recalcul.' USING ERRCODE = 'P0564';
  END IF;
  IF res.result_id IS NOT NULL AND res.score IS DISTINCT FROM n.score20 THEN
    RAISE EXCEPTION 'NOTE_DIVERGENTE: note enregistrée différente du calcul ; vérification humaine requise, aucune note modifiée.' USING ERRCODE = 'P0563';
  END IF;

  v_avant := CASE WHEN res.result_id IS NULL THEN NULL ELSE to_jsonb(res) END;
  v_statut_attendu := CASE WHEN n.qrc_restantes = 0 THEN 'definitif' ELSE 'provisoire' END;

  IF res.result_id IS NOT NULL
     AND res.status = v_statut_attendu
     AND res.qrc_restantes IS NOT DISTINCT FROM n.qrc_restantes THEN
    v_retour := jsonb_build_object('statut', 'deja_coherent', 'attempt_id', p_attempt_id,
      'result_revision', res.result_revision, 'status', res.status, 'score', res.score, 'qrc_restantes', res.qrc_restantes);
  ELSE
    apres := public.core_recalc_result(p_attempt_id);
    v_retour := jsonb_build_object('statut', 'actualise', 'attempt_id', p_attempt_id,
      'result_revision', apres.result_revision, 'status', apres.status, 'score', apres.score, 'qrc_restantes', apres.qrc_restantes);
  END IF;

  INSERT INTO public.eb_notes_synchronisations (operation_id, attempt_id, apprenant_id, acteur, motif, avant, apres)
  VALUES (p_operation_id, p_attempt_id, att.apprenant_id, public.core_identite_api_verifiee(), v_retour->>'statut', v_avant, v_retour);

  RETURN v_retour;
END;
$function$;
