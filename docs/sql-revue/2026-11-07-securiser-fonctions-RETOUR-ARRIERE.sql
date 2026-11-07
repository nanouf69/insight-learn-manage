-- RETOUR ARRIÈRE du durcissement 2026-11-07 — NE PAS EXÉCUTER sauf incident après activation.
-- Rétablit les définitions de production figées le 07/11 (src/test/fixtures/*_live_20261107.sql)
-- et les droits EXECUTE d'origine (y compris l'exposition corrigée par le durcissement).
-- Aucune donnée lue ou écrite. Généré mécaniquement depuis les fixtures.
BEGIN;

-- core_operation_replay
CREATE OR REPLACE FUNCTION public.core_operation_replay(p_operation_id uuid, p_operation_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existante public.core_operations%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'OPERATION_ID_OBLIGATOIRE: toute ecriture doit porter un operation_id unique.'
      USING ERRCODE = 'P0482';
  END IF;

  SELECT * INTO existante FROM public.core_operations WHERE operation_id = p_operation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF existante.operation_type <> p_operation_type THEN
    RAISE EXCEPTION 'OPERATION_ID_REUTILISE: operation_id % deja utilise pour une operation de type %.',
      p_operation_id, existante.operation_type
      USING ERRCODE = 'P0482';
  END IF;

  RETURN jsonb_build_object('rejeu', true, 'resultat', existante.resultat);
END;
$function$

;

-- core_note_attempt
CREATE OR REPLACE FUNCTION public.core_note_attempt(p_attempt_id uuid)
 RETURNS TABLE(points_qcm numeric, points_qrc numeric, total numeric, score20 numeric, qrc_restantes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  att public.exam_attempts_v2;
  q jsonb;
  v_total numeric := 0;
  v_qcm numeric := 0;
  v_qrc numeric := 0;
  v_rest integer := 0;
  v_reponse text;
  v_choisies text[];
  v_attendues text[];
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id;
  IF att IS NULL THEN
    RAISE EXCEPTION 'ATTEMPT_INCONNUE: %', p_attempt_id USING ERRCODE = 'P0475';
  END IF;

  FOR q IN SELECT value FROM jsonb_array_elements(coalesce(att.snapshot->'questions', '[]'::jsonb)) LOOP
    v_total := v_total + coalesce((q #>> '{points}')::numeric, 0);

    IF coalesce(q->>'type', '') <> 'QRC' AND jsonb_typeof(q->'choix') = 'array' THEN
      SELECT array_agg(upper(c->>'lettre') ORDER BY c->>'lettre')
        INTO v_attendues
      FROM jsonb_array_elements(q->'choix') c
      WHERE (c->>'correct')::boolean IS TRUE;

      SELECT valeur INTO v_reponse
      FROM public.answer_state
      WHERE attempt_id = p_attempt_id AND question_id = q->>'id';

      IF v_attendues IS NOT NULL AND v_reponse IS NOT NULL THEN
        SELECT array_agg(DISTINCT m[1] ORDER BY m[1])
          INTO v_choisies
        FROM regexp_matches(upper(v_reponse), '[A-E]', 'g') AS m;

        IF v_choisies IS NOT NULL AND v_choisies = v_attendues THEN
          v_qcm := v_qcm + coalesce((q #>> '{points}')::numeric, 0);
        END IF;
      END IF;
    END IF;
  END LOOP;

  SELECT coalesce(sum(note), 0), count(*) FILTER (WHERE etat = 'en_attente')
    INTO v_qrc, v_rest
  FROM public.qrc_instances_v2 WHERE attempt_id = p_attempt_id;

  points_qcm := v_qcm;
  points_qrc := v_qrc;
  total := v_total;
  score20 := CASE WHEN v_total > 0 THEN round((v_qcm + v_qrc) / v_total * 20, 2) ELSE NULL END;
  qrc_restantes := v_rest;
  RETURN NEXT;
END;
$function$

;

-- core_recalc_result
CREATE OR REPLACE FUNCTION public.core_recalc_result(p_attempt_id uuid)
 RETURNS core_exam_results
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  att public.exam_attempts_v2;
  n record;
  res public.core_exam_results;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF att IS NULL THEN
    RAISE EXCEPTION 'ATTEMPT_INCONNUE: %', p_attempt_id USING ERRCODE = 'P0475';
  END IF;

  SELECT * INTO n FROM public.core_note_attempt(p_attempt_id);

  INSERT INTO public.core_exam_results (attempt_id, apprenant_id, result_revision, status, score, total, qrc_restantes, published_at)
  VALUES (p_attempt_id, att.apprenant_id, 1,
          CASE WHEN n.qrc_restantes = 0 THEN 'definitif' ELSE 'provisoire' END,
          n.score20, n.total, n.qrc_restantes,
          CASE WHEN n.qrc_restantes = 0 THEN now() ELSE NULL END)
  ON CONFLICT (attempt_id) DO UPDATE SET
    result_revision = public.core_exam_results.result_revision + 1,
    status = EXCLUDED.status,
    score = EXCLUDED.score,
    total = EXCLUDED.total,
    qrc_restantes = EXCLUDED.qrc_restantes,
    published_at = CASE WHEN EXCLUDED.status = 'definitif'
                        THEN coalesce(public.core_exam_results.published_at, now()) ELSE NULL END,
    updated_at = now()
  RETURNING * INTO res;

  RETURN res;
END;
$function$

;

-- core_correct_qrc
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

;

-- core_correct_qrc_publish
CREATE OR REPLACE FUNCTION public.core_correct_qrc_publish(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rejoue jsonb;
  inst public.qrc_instances_v2;
  res public.core_exam_results;
BEGIN
  SELECT resultat INTO rejoue FROM public.core_operations WHERE operation_id = p_operation_id;
  IF rejoue IS NOT NULL THEN
    RETURN rejoue;  -- idempotence : double-clic, F5, retry réseau
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'CORRECTION_NON_AUTORISEE: seul un administrateur peut corriger une QRC.'
      USING ERRCODE = 'P0481';
  END IF;

  PERFORM public.core_correct_qrc(p_operation_id, p_qrc_instance_id, p_note, p_commentaire, p_corrige_email);

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id;
  res := public.core_recalc_result(inst.attempt_id);

  RETURN jsonb_build_object(
    'qrc_instance_id', inst.qrc_instance_id,
    'etat', inst.etat,
    'note', inst.note,
    'result_id', res.result_id,
    'result_revision', res.result_revision,
    'status', res.status,
    'score', res.score,
    'qrc_restantes', res.qrc_restantes
  );
END;
$function$

;

-- core_revise_qrc_publish
CREATE OR REPLACE FUNCTION public.core_revise_qrc_publish(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_note_attendue numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
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
  v_resultat jsonb;
BEGIN
  SELECT o.resultat INTO rejoue FROM public.core_operations o WHERE o.operation_id = p_operation_id;
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

  v_resultat := jsonb_build_object(
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
          jsonb_build_object('qrc_instance_id', p_qrc_instance_id), v_resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, attempt_id, apprenant_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('qrc_correction_revision', 'qrc_instances_v2', p_qrc_instance_id::text, inst.attempt_id, inst.apprenant_id,
          auth.uid(), p_corrige_email,
          jsonb_build_object('note', ancienne), jsonb_build_object('note', inst.note),
          'core_revise_qrc_publish');

  RETURN v_resultat;
END;
$function$

;

GRANT EXECUTE ON FUNCTION public.core_note_attempt(uuid), public.core_recalc_result(uuid), public.core_correct_qrc(uuid, uuid, numeric, text, text), public.core_correct_qrc_publish(uuid, uuid, numeric, text, text), public.core_revise_qrc_publish(uuid, uuid, numeric, numeric, text, text) TO PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.core_contexte_tentative_autorise(uuid);
DROP FUNCTION IF EXISTS public.core_contexte_correction_autorise();
DROP FUNCTION IF EXISTS public.core_identite_api_verifiee();
COMMIT;
