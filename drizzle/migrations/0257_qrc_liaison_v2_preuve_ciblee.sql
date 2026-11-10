-- 2026-11-10 10:49 UTC — QRC historical linkage (prepared from the LIVE definitions read the same day).
-- No learner row is updated or deleted. QRC text stays literal; only frozen QCM letter arrays may be permuted.
-- Targeted linkage: an append-only proof row per original result, re-verified live at every grading call.

CREATE OR REPLACE FUNCTION public.qrc_historique_reponses_identiques(p_details jsonb, p_reponses jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $body$
DECLARE k text; a jsonb; b jsonb; q jsonb; qs jsonb := p_details->'snapshot'->'questions';
BEGIN
 IF jsonb_typeof(p_details->'reponses') IS DISTINCT FROM 'object' OR jsonb_typeof(p_reponses) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_details->'reponses')) = 0
 OR (SELECT count(*) FROM jsonb_object_keys(p_details->'reponses')) <> (SELECT count(*) FROM jsonb_object_keys(p_reponses)) THEN RETURN false; END IF;
 FOR k,a IN SELECT key,value FROM jsonb_each(p_details->'reponses') LOOP
  IF NOT p_reponses ? k THEN RETURN false; END IF;
  b := p_reponses->k;
  IF a = b THEN CONTINUE; END IF;
  IF jsonb_typeof(qs) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(qs) x WHERE coalesce(x->>'id',x->>'questionId')=k) <> 1 THEN RETURN false; END IF;
  SELECT x INTO q FROM jsonb_array_elements(qs) x WHERE coalesce(x->>'id',x->>'questionId')=k;
  IF upper(q->>'type') IS DISTINCT FROM 'QCM' OR jsonb_typeof(a) IS DISTINCT FROM 'array' OR jsonb_typeof(b) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(a)=0 OR jsonb_array_length(a)<>jsonb_array_length(b) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(a || b) x WHERE jsonb_typeof(x) <> 'string' OR x #>> '{}' !~ '^[A-E]$') THEN RETURN false; END IF;
  IF (SELECT count(DISTINCT x) FROM jsonb_array_elements(a) x) <> jsonb_array_length(a)
   OR (SELECT count(DISTINCT x) FROM jsonb_array_elements(b) x) <> jsonb_array_length(b) THEN RETURN false; END IF;
  IF (SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements(a) x) IS DISTINCT FROM
     (SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements(b) x) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $body$;
REVOKE ALL ON FUNCTION public.qrc_historique_reponses_identiques(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_historique_reponses_identiques(jsonb,jsonb) TO authenticated;

-- Append-only proof of linkage for historical copies whose submission row carries the attempt in its
-- immutable exercise key (suffix __tN) while its legacy tentative column was left at the column default (1).
CREATE TABLE IF NOT EXISTS public.qrc_historique_liaisons_remise (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL UNIQUE,
  remise_id uuid NOT NULL UNIQUE,
  apprenant_id uuid NOT NULL,
  quiz_id text NOT NULL,
  matiere_id text NOT NULL,
  exercice_id text NOT NULL,
  tentative_resultat integer NOT NULL CHECK (tentative_resultat > 1),
  tentative_remise integer NOT NULL CHECK (tentative_remise = 1),
  empreinte_reponses_resultat text NOT NULL,
  empreinte_reponses_remise text NOT NULL,
  empreinte_snapshot text NOT NULL,
  evenements_journal integer NOT NULL CHECK (evenements_journal > 0),
  motif text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qrc_historique_liaisons_remise TO authenticated;
GRANT ALL ON public.qrc_historique_liaisons_remise TO service_role;
ALTER TABLE public.qrc_historique_liaisons_remise ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins lisent les liaisons QRC prouvees" ON public.qrc_historique_liaisons_remise;
CREATE POLICY "Admins lisent les liaisons QRC prouvees" ON public.qrc_historique_liaisons_remise
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.qrc_historique_liaisons_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN RAISE EXCEPTION 'Preuve de liaison append-only : aucune modification ni suppression' USING ERRCODE = '42501'; END $f$;
DROP TRIGGER IF EXISTS trg_qrc_historique_liaisons_append_only ON public.qrc_historique_liaisons_remise;
CREATE TRIGGER trg_qrc_historique_liaisons_append_only BEFORE UPDATE OR DELETE ON public.qrc_historique_liaisons_remise
  FOR EACH ROW EXECUTE FUNCTION public.qrc_historique_liaisons_append_only();
DROP TRIGGER IF EXISTS trg_qrc_historique_liaisons_no_truncate ON public.qrc_historique_liaisons_remise;
CREATE TRIGGER trg_qrc_historique_liaisons_no_truncate BEFORE TRUNCATE ON public.qrc_historique_liaisons_remise
  FOR EACH STATEMENT EXECUTE FUNCTION public.qrc_historique_liaisons_append_only();

-- Live re-verification: the recorded proof only counts while every fingerprint and identity still matches.
CREATE OR REPLACE FUNCTION public.qrc_historique_liaison_prouvee(p_result_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $f$
  SELECT EXISTS (
    SELECT 1
    FROM public.qrc_historique_liaisons_remise l
    JOIN public.apprenant_quiz_results r ON r.id = l.result_id
    JOIN public.reponses_apprenants a ON a.id = l.remise_id
    WHERE l.result_id = p_result_id
      AND r.apprenant_id = l.apprenant_id AND a.apprenant_id = l.apprenant_id
      AND r.quiz_type = 'examen_blanc' AND r.quiz_id = l.quiz_id AND r.quiz_id ~ '^EB[1-6]$'
      AND r.matiere_id = l.matiere_id AND r.completed_at IS NOT NULL
      AND r.tentative = l.tentative_resultat
      AND l.exercice_id = r.quiz_id || '__' || r.matiere_id || '__t' || r.tentative
      AND a.exercice_id = l.exercice_id
      AND coalesce(a.tentative, 1) = l.tentative_remise
      AND a.completed IS TRUE AND a.status = 'submitted' AND a.submitted_at IS NOT NULL
      AND md5(a.reponses::text) = l.empreinte_reponses_remise
      AND md5((r.details->'reponses')::text) = l.empreinte_reponses_resultat
      AND md5((r.details->'snapshot')::text) = l.empreinte_snapshot
      AND public.qrc_historique_reponses_identiques(r.details, a.reponses)
      AND (SELECT count(*) FROM public.reponses_apprenants b
            WHERE b.apprenant_id = r.apprenant_id AND b.exercice_id = l.exercice_id) = 1
      AND (SELECT count(*) FROM public.apprenant_quiz_results x
            WHERE x.apprenant_id = r.apprenant_id AND x.quiz_id = r.quiz_id
              AND x.matiere_id = r.matiere_id AND x.tentative = r.tentative) = 1
  )
$f$;
REVOKE ALL ON FUNCTION public.qrc_historique_liaison_prouvee(uuid) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.qrc_historique_corrections DROP CONSTRAINT IF EXISTS qrc_historique_corrections_provenance_check;
ALTER TABLE public.qrc_historique_corrections ADD CONSTRAINT qrc_historique_corrections_provenance_check
  CHECK (provenance = ANY (ARRAY['remise_identique'::text, 'remise_horodatage_divergent'::text, 'resultat_seul'::text, 'liaison_prouvee'::text]));

-- Read-only preflight derives all identity from the original recorded result.
CREATE OR REPLACE FUNCTION public.qrc_historique_preuve_remise(p_result_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $body$
DECLARE r public.apprenant_quiz_results; exo text; prov text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.apprenant_quiz_results WHERE id=p_result_id;
 IF NOT FOUND OR r.quiz_type <> 'examen_blanc' OR r.quiz_id !~ '^EB[1-6]$' OR r.completed_at IS NULL THEN
 RAISE EXCEPTION 'Copie terminée historique VTC requise' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=r.apprenant_id AND
  (a.snapshot->'source_historique'->>'result_id'=r.id::text OR a.snapshot->>'result_id'=r.id::text)) THEN
 RAISE EXCEPTION 'Copie déjà liée au moteur V2' USING ERRCODE='P0001'; END IF;
 exo := r.quiz_id||'__'||r.matiere_id||CASE WHEN coalesce(r.tentative,1)>1 THEN '__t'||r.tentative ELSE '' END;
 SELECT CASE WHEN count(*)=0 THEN 'resultat_seul' WHEN bool_or(a.submitted_at=r.completed_at) THEN 'remise_identique' ELSE 'remise_horodatage_divergent' END INTO prov
 FROM public.reponses_apprenants a WHERE a.apprenant_id=r.apprenant_id AND a.exercice_id=exo
  AND coalesce(a.tentative,1)=coalesce(r.tentative,1) AND a.completed IS TRUE AND a.status='submitted'
  AND a.submitted_at IS NOT NULL AND public.qrc_historique_reponses_identiques(r.details,a.reponses);
 IF prov='resultat_seul' AND public.qrc_historique_liaison_prouvee(r.id) THEN prov := 'liaison_prouvee'; END IF;
 RETURN jsonb_build_object('result_id',r.id,'apprenant_id',r.apprenant_id,'matiere_id',r.matiere_id,'tentative',r.tentative,'provenance',prov);
END $body$;
REVOKE ALL ON FUNCTION public.qrc_historique_preuve_remise(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_historique_preuve_remise(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.qrc_historique_noter(p_operation_id text, p_result_id uuid, p_question_id text, p_note numeric, p_score_attendu numeric, p_seuil numeric DEFAULT NULL::numeric, p_commentaire text DEFAULT ''::text, p_reconnaissance text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      RAISE EXCEPTION 'Conflit d''opération' USING ERRCODE = 'P0409';
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
    RAISE EXCEPTION 'Copie modifiée depuis l''affichage : recharger' USING ERRCODE = 'P0409';
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
    AND a.submitted_at IS NOT NULL AND public.qrc_historique_reponses_identiques(r.details, a.reponses);
  v_prov := coalesce(v_prov, 'resultat_seul');
  -- Targeted append-only proof (suffix __tN, legacy tentative column left at its default): re-verified live.
  IF v_prov = 'resultat_seul' AND public.qrc_historique_liaison_prouvee(r.id) THEN v_prov := 'liaison_prouvee'; END IF;
  -- First grading of an unproven copy is refused even with a typed recognition (UI never sends one).
  IF v_prov = 'resultat_seul' THEN
    RAISE EXCEPTION 'Remise non prouvée : correction refusée sans contournement manuel' USING ERRCODE = 'P0001';
  END IF;
  IF v_prov = 'remise_horodatage_divergent' AND nullif(btrim(coalesce(p_reconnaissance,'')),'') IS NULL THEN
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
END $function$;

CREATE OR REPLACE FUNCTION public.qrc_historique_reviser(p_operation_id text, p_result_id uuid, p_question_id text, p_note numeric, p_note_attendue numeric, p_score_attendu numeric, p_seuil numeric DEFAULT NULL::numeric, p_commentaire text DEFAULT ''::text, p_reconnaissance text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_prior public.qrc_historique_corrections;
  r public.apprenant_quiz_results;
  v_snap jsonb; v_q jsonb; v_bareme numeric; v_corrs jsonb; v_prev jsonb; v_prev_pts numeric := 0;
  v_qcm numeric; v_ia numeric; v_exo text; v_prov text; v_new jsonb; v_new_corrs jsonb;
  v_score numeric; v_note20 numeric; v_reussi boolean; v_complet boolean; v_after public.apprenant_quiz_results; v_rev integer;
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

  PERFORM pg_advisory_xact_lock(hashtextextended('qrchist:op:' || p_operation_id, 0));
  SELECT * INTO v_prior FROM public.qrc_historique_corrections WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_prior.result_id <> p_result_id OR v_prior.question_id <> p_question_id
       OR v_prior.note <> p_note OR v_prior.acteur <> v_uid THEN
      RAISE EXCEPTION 'Conflit d''opération' USING ERRCODE = 'P0409';
    END IF;
    RETURN to_jsonb(v_prior) || jsonb_build_object('rejeu', true);
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
  IF NOT coalesce(public.qrc_historique_valide(v_prev), false) OR jsonb_typeof(v_prev->'pointsObtenus') IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'QRC non corrigée : utiliser la première notation' USING ERRCODE = 'P0001';
  END IF;
  IF p_note_attendue IS NULL OR (v_prev->>'pointsObtenus')::numeric <> p_note_attendue THEN
    RAISE EXCEPTION 'Note modifiée depuis l''affichage : recharger' USING ERRCODE = 'P0409';
  END IF;
  IF (v_prev->>'pointsObtenus')::numeric = p_note THEN
    RAISE EXCEPTION 'Nouvelle note identique à la note actuelle' USING ERRCODE = '22023';
  END IF;
  v_prev_pts := (v_prev->>'pointsObtenus')::numeric;

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
    RAISE EXCEPTION 'Copie modifiée depuis l''affichage : recharger' USING ERRCODE = 'P0409';
  END IF;

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
  -- Targeted append-only proof (suffix __tN, legacy tentative column left at its default): re-verified live.
  IF v_prov = 'resultat_seul' AND public.qrc_historique_liaison_prouvee(r.id) THEN v_prov := 'liaison_prouvee'; END IF;
  IF v_prov = 'resultat_seul' AND nullif(btrim(coalesce(p_reconnaissance,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Remise ambiguë (%) : confirmation explicite requise', v_prov USING ERRCODE = 'P0001';
  END IF;

  v_new := jsonb_build_object(
    'estCorrect', p_note >= v_bareme, 'pointsObtenus', p_note, 'nombrefautes', 0,
    'explication', format('Correction manuelle par l''administrateur : %s/%s pts', p_note, v_bareme),
    'commentaire', coalesce(p_commentaire,''), 'correctedAt', now(), 'manuel', true, 'validatedByAdmin', true,
    'source', 'correcteur_v2_historique', 'revision', true, 'operationId', p_operation_id, 'provenance', v_prov,
    'propositionPrecedente', v_prev);
  v_new_corrs := v_corrs || jsonb_build_object(p_question_id, v_new);

  v_score := r.score_obtenu - v_prev_pts + p_note;
  IF r.score_max IS NULL OR r.score_max <= 0 OR v_score < 0 OR v_score > r.score_max THEN
    RAISE EXCEPTION 'Score recalculé hors bornes' USING ERRCODE = 'P0001';
  END IF;
  v_note20 := round((v_score / r.score_max) * 20, 1);

  SELECT NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_snap) x
    WHERE upper(coalesce(x->>'type','')) = 'QRC'
      AND btrim(coalesce(r.details->'reponses'->>(x->>'id'), '')) NOT IN ('', '[]')
      AND NOT coalesce(public.qrc_historique_valide(v_new_corrs->(x->>'id')), false)
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

  SELECT coalesce(max(j.revision), 0) + 1 INTO v_rev FROM public.qrc_historique_corrections j
   WHERE j.result_id = r.id AND j.question_id = p_question_id;
  INSERT INTO public.qrc_historique_corrections(operation_id, result_id, apprenant_id, quiz_id, matiere_id, tentative,
    question_id, note, bareme, commentaire, provenance, reconnaissance, correction_precedente, revision, note_precedente,
    score_avant, score_apres, note20_avant, note20_apres, reussi_avant, reussi_apres, acteur)
  VALUES (p_operation_id, r.id, r.apprenant_id, r.quiz_id, r.matiere_id, r.tentative,
    p_question_id, p_note, v_bareme, coalesce(p_commentaire,''), v_prov, nullif(btrim(coalesce(p_reconnaissance,'')),''), v_prev, v_rev, v_prev_pts,
    r.score_obtenu, v_score, r.note_sur_20, v_note20, r.reussi, v_reussi, v_uid)
  RETURNING * INTO v_prior;
  RETURN to_jsonb(v_prior) || jsonb_build_object('rejeu', false, 'matiere_complete', v_complet);
END $function$;

-- Targeted proof rows for the five EB2 tentative-3 copies of one learner, named in the 10/11 report.
-- Every criterion is recomputed from server rows; the statement inserts nothing it cannot prove,
-- and the assertion below aborts the whole migration unless all five are proven.
INSERT INTO public.qrc_historique_liaisons_remise (result_id, remise_id, apprenant_id, quiz_id, matiere_id, exercice_id,
  tentative_resultat, tentative_remise, empreinte_reponses_resultat, empreinte_reponses_remise, empreinte_snapshot,
  evenements_journal, motif)
SELECT r.id, a.id, r.apprenant_id, r.quiz_id, r.matiere_id, a.exercice_id, r.tentative, coalesce(a.tentative, 1),
  md5((r.details->'reponses')::text), md5(a.reponses::text), md5((r.details->'snapshot')::text),
  (SELECT count(*) FROM public.reponses_apprenants_journal j
    WHERE j.apprenant_id = r.apprenant_id AND j.exercice_id = a.exercice_id AND j.tentative = r.tentative),
  'Remise suffixée __t' || r.tentative || ' (colonne tentative laissée à sa valeur par défaut 1), seule remise de cet exercice, '
   || 'réponses identiques (permutation QCM figée seule admise), journal de réponses exclusivement en tentative ' || r.tentative
FROM public.apprenant_quiz_results r
JOIN public.reponses_apprenants a
  ON a.apprenant_id = r.apprenant_id AND a.exercice_id = r.quiz_id || '__' || r.matiere_id || '__t' || r.tentative
WHERE r.id IN ('eb1e925b-53ee-4995-8cf2-df3cebdcc478','7e9d1b67-f6de-4ab0-a8e0-b43ecfd7cf22','2fa844d9-1e7d-4b66-b2fd-3c38c6088bce',
               'd1dc3592-95eb-4a95-aed6-0e04b0a8b9e5','65ff5584-95cc-4e12-a926-543d809c186c')
  AND r.quiz_type = 'examen_blanc' AND r.quiz_id = 'EB2' AND r.completed_at IS NOT NULL AND r.tentative > 1
  AND coalesce(a.tentative, 1) = 1
  AND a.completed IS TRUE AND a.status = 'submitted' AND a.submitted_at IS NOT NULL
  AND public.qrc_historique_reponses_identiques(r.details, a.reponses)
  AND (SELECT count(*) FROM public.reponses_apprenants b WHERE b.apprenant_id = r.apprenant_id AND b.exercice_id = a.exercice_id) = 1
  AND (SELECT count(*) FROM public.apprenant_quiz_results x WHERE x.apprenant_id = r.apprenant_id AND x.quiz_id = r.quiz_id
        AND x.matiere_id = r.matiere_id AND x.tentative = r.tentative) = 1
  AND EXISTS (SELECT 1 FROM public.reponses_apprenants_journal j
        WHERE j.apprenant_id = r.apprenant_id AND j.exercice_id = a.exercice_id AND j.tentative = r.tentative)
  AND NOT EXISTS (SELECT 1 FROM public.reponses_apprenants_journal j
        WHERE j.apprenant_id = r.apprenant_id AND j.exercice_id = a.exercice_id AND j.tentative IS DISTINCT FROM r.tentative)
  AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 v WHERE v.apprenant_id = r.apprenant_id
        AND (v.snapshot->'source_historique'->>'result_id' = r.id::text OR v.snapshot->>'result_id' = r.id::text))
ON CONFLICT (result_id) DO NOTHING;

DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM unnest(ARRAY['eb1e925b-53ee-4995-8cf2-df3cebdcc478','7e9d1b67-f6de-4ab0-a8e0-b43ecfd7cf22',
    '2fa844d9-1e7d-4b66-b2fd-3c38c6088bce','d1dc3592-95eb-4a95-aed6-0e04b0a8b9e5','65ff5584-95cc-4e12-a926-543d809c186c']::uuid[]) id
  WHERE public.qrc_historique_liaison_prouvee(id);
  IF n <> 5 THEN RAISE EXCEPTION 'Liaison non prouvée pour % copie(s) sur 5 : migration annulée', 5 - n; END IF;
END $assert$;