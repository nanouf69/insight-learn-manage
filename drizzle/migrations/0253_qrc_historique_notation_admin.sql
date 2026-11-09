-- Notation admin des copies EB historiques sans fiche V2 (autorisée le 09/11/2026 17:31 UTC).
-- Additive : journal append-only + une fonction admin transactionnelle. Aucune donnée existante modifiée par cette migration.
CREATE TABLE IF NOT EXISTS public.qrc_historique_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id text NOT NULL UNIQUE,
  result_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  quiz_id text NOT NULL,
  matiere_id text,
  tentative integer,
  question_id text NOT NULL,
  note numeric NOT NULL CHECK (note >= 0),
  bareme numeric NOT NULL CHECK (bareme > 0),
  commentaire text NOT NULL DEFAULT '',
  provenance text NOT NULL CHECK (provenance IN ('remise_identique','remise_horodatage_divergent','resultat_seul')),
  reconnaissance text,
  correction_precedente jsonb,
  score_avant numeric,
  score_apres numeric,
  note20_avant numeric,
  note20_apres numeric,
  reussi_avant boolean,
  reussi_apres boolean,
  acteur uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, question_id)
);
GRANT SELECT ON public.qrc_historique_corrections TO authenticated;
GRANT ALL ON public.qrc_historique_corrections TO service_role;
ALTER TABLE public.qrc_historique_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_historique_corrections_admin_lecture ON public.qrc_historique_corrections
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.qrc_historique_corrections_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Journal de correction historique en ajout seul' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER trg_qrc_historique_corrections_append_only
  BEFORE UPDATE OR DELETE ON public.qrc_historique_corrections
  FOR EACH ROW EXECUTE FUNCTION public.qrc_historique_corrections_append_only();

-- Réponse QCM normalisée (tableau trié de textes).
CREATE OR REPLACE FUNCTION public.qrc_historique_choix(p jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(e ORDER BY e), '[]'::jsonb)
  FROM jsonb_array_elements_text(CASE jsonb_typeof(p)
    WHEN 'array' THEN p WHEN 'string' THEN jsonb_build_array(p) ELSE '[]'::jsonb END) e
$$;

CREATE OR REPLACE FUNCTION public.qrc_historique_valide(c jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_typeof(c) = 'object' AND (
    c->>'validatedByAdmin' = 'true' OR c->>'manuel' = 'true' OR coalesce(c->>'correctedBy','') LIKE 'ia:%')
$$;

CREATE OR REPLACE FUNCTION public.qrc_historique_noter(
  p_operation_id text,
  p_result_id uuid,
  p_question_id text,
  p_note numeric,
  p_score_attendu numeric,
  p_seuil numeric DEFAULT NULL,
  p_commentaire text DEFAULT '',
  p_reconnaissance text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prior public.qrc_historique_corrections;
  r public.apprenant_quiz_results;
  v_snap jsonb; v_q jsonb; v_bareme numeric; v_corrs jsonb; v_prev jsonb; v_prev_pts numeric := 0;
  v_qcm numeric; v_ia numeric; v_exo text; v_prov text; v_new jsonb; v_new_corrs jsonb;
  v_score numeric; v_note20 numeric; v_reussi boolean; v_complet boolean; v_after public.apprenant_quiz_results;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Administrateur requis' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(coalesce(p_operation_id,'')),'') IS NULL OR p_result_id IS NULL
     OR nullif(btrim(coalesce(p_question_id,'')),'') IS NULL OR p_note IS NULL OR p_score_attendu IS NULL THEN
    RAISE EXCEPTION 'Commande de correction incomplète' USING ERRCODE = '22023';
  END IF;
  IF p_seuil IS NOT NULL AND (p_seuil < 0 OR p_seuil > 20) THEN
    RAISE EXCEPTION 'Seuil invalide' USING ERRCODE = '22023';
  END IF;

  -- Idempotence : même opération = même résultat, quel que soit l'appareil.
  PERFORM pg_advisory_xact_lock(hashtextextended('qrchist:op:' || p_operation_id, 0));
  SELECT * INTO v_prior FROM public.qrc_historique_corrections WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_prior.result_id <> p_result_id OR v_prior.question_id <> p_question_id
       OR v_prior.note <> p_note OR v_prior.acteur <> v_uid THEN
      RAISE EXCEPTION 'Conflit d''opération' USING ERRCODE = '40001';
    END IF;
    RETURN to_jsonb(v_prior) || jsonb_build_object('rejeu', true);
  END IF;

  -- Verrou de la copie originale contre toute écriture concurrente jusqu'au commit.
  SELECT * INTO r FROM public.apprenant_quiz_results WHERE id = p_result_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Copie introuvable' USING ERRCODE = 'P0002'; END IF;
  IF r.quiz_type IS DISTINCT FROM 'examen_blanc' OR r.quiz_id !~ '^EB[1-6](-TAXI)?$' OR r.completed_at IS NULL THEN
    RAISE EXCEPTION 'Copie hors périmètre (examen blanc terminé requis)' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id = r.apprenant_id
       AND (a.snapshot->'source_historique'->>'result_id' = r.id::text OR a.snapshot->>'result_id' = r.id::text)) THEN
    RAISE EXCEPTION 'Copie déjà liée au moteur V2 : corriger la fiche V2' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.qrc_historique_corrections j WHERE j.result_id = r.id AND j.question_id = p_question_id) THEN
    RAISE EXCEPTION 'QRC déjà corrigée : aucune réécriture' USING ERRCODE = 'P0001';
  END IF;

  v_snap := r.details->'snapshot'->'questions';
  IF jsonb_typeof(v_snap) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Questions figées absentes : correction refusée' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(v_snap) x WHERE x->>'id' = p_question_id) <> 1 THEN
    RAISE EXCEPTION 'Identité de question absente ou ambiguë' USING ERRCODE = 'P0001';
  END IF;
  SELECT x INTO v_q FROM jsonb_array_elements(v_snap) x WHERE x->>'id' = p_question_id;
  IF upper(coalesce(v_q->>'type','')) <> 'QRC' THEN
    RAISE EXCEPTION 'Question non QRC' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(v_q->'points') IS DISTINCT FROM 'number' OR (v_q->>'points')::numeric <= 0 THEN
    RAISE EXCEPTION 'Barème figé absent : correction refusée' USING ERRCODE = 'P0001';
  END IF;
  v_bareme := (v_q->>'points')::numeric;
  IF p_note < 0 OR p_note > v_bareme OR (p_note * 2) <> trunc(p_note * 2) THEN
    RAISE EXCEPTION 'Note hors barème (0 à %, par demi-point)', v_bareme USING ERRCODE = '22023';
  END IF;

  v_corrs := r.details->'correctionsIA';
  IF v_corrs IS NULL OR jsonb_typeof(v_corrs) = 'null' THEN v_corrs := '{}'::jsonb; END IF;
  IF jsonb_typeof(v_corrs) <> 'object' THEN
    RAISE EXCEPTION 'Corrections enregistrées illisibles : correction refusée' USING ERRCODE = 'P0001';
  END IF;
  v_prev := v_corrs->p_question_id;
  IF public.qrc_historique_valide(v_prev) THEN
    RAISE EXCEPTION 'QRC déjà corrigée : aucune réécriture' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(v_prev->'pointsObtenus') = 'number' THEN v_prev_pts := (v_prev->>'pointsObtenus')::numeric; END IF;

  -- Preuve du score : score enregistré = QCM exacts (points figés) + points de corrections enregistrés.
  SELECT coalesce(sum(coalesce((sn->>'points')::numeric, 1)), 0) INTO v_qcm
  FROM jsonb_array_elements(coalesce(r.details->'questions','[]'::jsonb)) q
  LEFT JOIN LATERAL (SELECT x sn FROM jsonb_array_elements(v_snap) x
                     WHERE x->>'id' = coalesce(q->>'questionId', q->>'id') LIMIT 1) z ON true
  WHERE upper(q->>'type') = 'QCM'
    AND public.qrc_historique_choix(q->'reponseCorrecte')
      = public.qrc_historique_choix(r.details->'reponses'->coalesce(q->>'questionId', q->>'id'));
  SELECT coalesce(sum((v->>'pointsObtenus')::numeric), 0) INTO v_ia
  FROM jsonb_each(v_corrs) e(k, v) WHERE jsonb_typeof(v->'pointsObtenus') = 'number';
  IF r.score_obtenu IS NULL OR abs(r.score_obtenu - (v_qcm + v_ia)) > 0.001 THEN
    RAISE EXCEPTION 'Score enregistré non prouvé par la copie : correction refusée' USING ERRCODE = 'P0001';
  END IF;
  IF abs(r.score_obtenu - p_score_attendu) > 0.001 THEN
    RAISE EXCEPTION 'Copie modifiée depuis l''affichage : recharger' USING ERRCODE = '40001';
  END IF;

  -- Provenance de la remise (jamais d'identité par texte ou fenêtre de temps).
  v_exo := 'EB' || substring(r.quiz_id from '^EB([1-6])') || '__' || coalesce(r.matiere_id,'')
           || CASE WHEN coalesce(r.tentative,1) <= 1 THEN '' ELSE '__t' || r.tentative END;
  IF r.quiz_id LIKE '%-TAXI' THEN v_exo := NULL; END IF;
  SELECT CASE WHEN count(*) = 0 THEN NULL WHEN bool_or(a.submitted_at = r.completed_at) THEN 'remise_identique' ELSE 'remise_horodatage_divergent' END
    INTO v_prov
  FROM public.reponses_apprenants a
  WHERE v_exo IS NOT NULL AND a.apprenant_id = r.apprenant_id AND a.exercice_id = v_exo
    AND coalesce(a.tentative,1) = coalesce(r.tentative,1) AND a.completed IS TRUE AND a.status = 'submitted'
    AND a.submitted_at IS NOT NULL AND a.reponses = r.details->'reponses';
  v_prov := coalesce(v_prov, 'resultat_seul');
  IF v_prov <> 'remise_identique' AND nullif(btrim(coalesce(p_reconnaissance,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Remise ambiguë (%) : confirmation explicite requise', v_prov USING ERRCODE = 'P0001';
  END IF;

  v_new := jsonb_build_object(
    'estCorrect', p_note >= v_bareme, 'pointsObtenus', p_note, 'nombrefautes', 0,
    'explication', format('Correction manuelle par l''administrateur : %s/%s pts', p_note, v_bareme),
    'commentaire', coalesce(p_commentaire,''), 'correctedAt', now(), 'manuel', true, 'validatedByAdmin', true,
    'source', 'correcteur_v2_historique', 'operationId', p_operation_id, 'provenance', v_prov)
    || CASE WHEN v_prev IS NOT NULL THEN jsonb_build_object('propositionPrecedente', v_prev) ELSE '{}'::jsonb END;
  v_new_corrs := v_corrs || jsonb_build_object(p_question_id, v_new);

  v_score := r.score_obtenu - v_prev_pts + p_note;
  IF r.score_max IS NULL OR r.score_max <= 0 OR v_score < 0 OR v_score > r.score_max THEN
    RAISE EXCEPTION 'Score recalculé hors bornes' USING ERRCODE = 'P0001';
  END IF;
  v_note20 := round((v_score / r.score_max) * 20, 1);

  -- Verdict matière mis à jour seulement quand toutes les QRC répondues sont validées.
  SELECT NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_snap) x
    WHERE upper(coalesce(x->>'type','')) = 'QRC'
      AND btrim(coalesce(r.details->'reponses'->>(x->>'id'), '')) NOT IN ('', '[]')
      AND NOT public.qrc_historique_valide(v_new_corrs->(x->>'id'))
  ) INTO v_complet;
  v_reussi := CASE WHEN v_complet AND p_seuil IS NOT NULL THEN v_note20 >= p_seuil ELSE r.reussi END;

  UPDATE public.apprenant_quiz_results
     SET score_obtenu = v_score, note_sur_20 = v_note20, reussi = v_reussi,
         details = jsonb_set(details, '{correctionsIA}', v_new_corrs, true)
   WHERE id = r.id;

  SELECT * INTO v_after FROM public.apprenant_quiz_results WHERE id = r.id;
  IF v_after.score_obtenu IS DISTINCT FROM v_score OR v_after.note_sur_20 IS DISTINCT FROM v_note20
     OR v_after.details->'reponses' IS DISTINCT FROM r.details->'reponses'
     OR v_after.details->'snapshot' IS DISTINCT FROM r.details->'snapshot'
     OR v_after.details->'questions' IS DISTINCT FROM r.details->'questions'
     OR v_after.details->'correctionsIA'->p_question_id IS DISTINCT FROM v_new THEN
    RAISE EXCEPTION 'Relecture non conforme : correction annulée' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.qrc_historique_corrections(operation_id, result_id, apprenant_id, quiz_id, matiere_id, tentative,
    question_id, note, bareme, commentaire, provenance, reconnaissance, correction_precedente,
    score_avant, score_apres, note20_avant, note20_apres, reussi_avant, reussi_apres, acteur)
  VALUES (p_operation_id, r.id, r.apprenant_id, r.quiz_id, r.matiere_id, r.tentative,
    p_question_id, p_note, v_bareme, coalesce(p_commentaire,''), v_prov, nullif(btrim(coalesce(p_reconnaissance,'')),''), v_prev,
    r.score_obtenu, v_score, r.note_sur_20, v_note20, r.reussi, v_reussi, v_uid)
  RETURNING * INTO v_prior;
  RETURN to_jsonb(v_prior) || jsonb_build_object('rejeu', false, 'matiere_complete', v_complet);
END $$;
REVOKE ALL ON FUNCTION public.qrc_historique_noter(text, uuid, text, numeric, numeric, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_historique_noter(text, uuid, text, numeric, numeric, numeric, text, text) TO authenticated;
