-- =====================================================================
-- REVUE UNIQUEMENT — NE PAS EXÉCUTER SANS VALIDATION DISTINCTE DU RESPONSABLE
-- Sécurisation des fonctions SECURITY DEFINER de correction / notation V2.
-- Aucune donnée lue ou écrite : seules les définitions et droits EXECUTE changent.
-- Corps métier strictement identiques aux définitions de production du 07/11/2026
-- (copiés depuis le catalogue) ; seules des gardes d'autorisation sont ajoutées.
--
-- Contextes autorisés :
--   * service_role (fonction IA qrc-ia-correction via qrc_ia_publier_*) ;
--   * administrateur authentifié (Correction QRC V2, révision) ;
--   * cron : identité SQL dédiée ftransport_qrc_cron, jamais absence de JWT ;
--     rôle NOLOGIN ci-dessous : connexion dédiée à provisionner/revoir séparément.
--     Le cron existant sous postgres est REFUSÉ tant que son identité n’est pas migrée.
--   * core_note_attempt / core_recalc_result : en plus, l'élève propriétaire
--     de la tentative (fin de passage, pontV2.ts).
-- Refus par défaut : anon, authentifié non admin, JWT sans identité (sub nul).
-- =====================================================================

-- Identité de connexion et rôle effectif, pas current_user (propriétaire du definer).
-- Les claims ne sont fiables que sur une connexion API authenticator autorisée
-- à SET ROLE par le serveur après vérification du JWT. Aucun rôle API ne reçoit
-- la capacité de choisir session_user ou de rejoindre le rôle cron.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'ftransport_qrc_cron') THEN
    CREATE ROLE ftransport_qrc_cron NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END;
$roles$;

CREATE OR REPLACE FUNCTION public.core_identite_api_verifiee()
 RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  claims jsonb;
  sub text;
BEGIN
  IF session_user <> 'authenticator'
     OR coalesce(current_setting('role', true), 'none') <> 'authenticated' THEN
    RETURN NULL;
  END IF;
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  IF claims IS NULL OR claims->>'role' IS DISTINCT FROM 'authenticated' THEN RETURN NULL; END IF;
  sub := claims->>'sub';
  IF sub IS NULL OR sub !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NULL; END IF;
  IF auth.uid() IS DISTINCT FROM sub::uuid OR auth.role() IS DISTINCT FROM 'authenticated' THEN RETURN NULL; END IF;
  RETURN sub::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.core_contexte_correction_autorise()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT CASE
    WHEN session_user = 'ftransport_qrc_cron'
      AND coalesce(current_setting('role', true), 'none') IN ('none', 'ftransport_qrc_cron') THEN true
    WHEN session_user = 'service_role'
      AND coalesce(current_setting('role', true), 'none') IN ('none', 'service_role') THEN true
    WHEN session_user = 'authenticator'
      AND current_setting('role', true) = 'service_role' THEN true
    ELSE coalesce(public.has_role(public.core_identite_api_verifiee(), 'admin'), false)
  END
$function$;

CREATE OR REPLACE FUNCTION public.core_contexte_tentative_autorise(p_apprenant_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT public.core_contexte_correction_autorise()
    OR (p_apprenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.apprenants a
      WHERE a.id = p_apprenant_id AND a.auth_user_id = public.core_identite_api_verifiee()
    ))
$function$;

CREATE OR REPLACE FUNCTION public.core_correct_qrc(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  rejeu jsonb;
  inst public.qrc_instances_v2%ROWTYPE;
  resultat jsonb;
BEGIN
  IF NOT public.core_contexte_correction_autorise() THEN
    RAISE EXCEPTION 'CORRECTION_NON_AUTORISEE: seul un administrateur ou le service de correction peut corriger une QRC.' USING ERRCODE = '42501';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.core_correct_qrc_publish(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  rejoue jsonb;
  inst public.qrc_instances_v2;
  res public.core_exam_results;
BEGIN
  IF NOT public.core_contexte_correction_autorise() THEN
    RAISE EXCEPTION 'CORRECTION_NON_AUTORISEE: seul un administrateur peut corriger une QRC.'
      USING ERRCODE = 'P0481';
  END IF;

  SELECT resultat INTO rejoue FROM public.core_operations WHERE operation_id = p_operation_id;
  IF rejoue IS NOT NULL THEN
    RETURN rejoue;  -- idempotence : double-clic, F5, retry réseau
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
$function$;

CREATE OR REPLACE FUNCTION public.core_revise_qrc_publish(p_operation_id uuid, p_qrc_instance_id uuid, p_note numeric, p_note_attendue numeric, p_commentaire text DEFAULT NULL::text, p_corrige_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  rejoue jsonb;
  inst public.qrc_instances_v2%ROWTYPE;
  ancienne numeric;
  res public.core_exam_results;
  v_resultat jsonb;
BEGIN
  IF NOT public.core_contexte_correction_autorise() THEN
    RAISE EXCEPTION 'REVISION_NON_AUTORISEE: seul un administrateur peut réviser une correction.'
      USING ERRCODE = 'P0481';
  END IF;

  SELECT o.resultat INTO rejoue FROM public.core_operations o WHERE o.operation_id = p_operation_id;
  IF rejoue IS NOT NULL THEN
    RETURN rejoue;
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
$function$;

CREATE OR REPLACE FUNCTION public.core_note_attempt(p_attempt_id uuid)
 RETURNS TABLE(points_qcm numeric, points_qrc numeric, total numeric, score20 numeric, qrc_restantes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
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

  IF NOT public.core_contexte_tentative_autorise(att.apprenant_id) THEN
    RAISE EXCEPTION 'TENTATIVE_NON_AUTORISEE: accès refusé à la tentative %.', p_attempt_id USING ERRCODE = '42501';
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
$function$;

CREATE OR REPLACE FUNCTION public.core_recalc_result(p_attempt_id uuid)
 RETURNS public.core_exam_results
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
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

  IF NOT public.core_contexte_tentative_autorise(att.apprenant_id) THEN
    RAISE EXCEPTION 'TENTATIVE_NON_AUTORISEE: accès refusé à la tentative %.', p_attempt_id USING ERRCODE = '42501';
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
$function$;

-- Droits EXECUTE : plus aucun appel anonyme ; correction brute et calcul interne
-- réservés aux fonctions appelantes (exécutées en tant que propriétaire).
REVOKE ALL ON FUNCTION public.core_contexte_correction_autorise() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.core_contexte_tentative_autorise(uuid) FROM PUBLIC, anon;



REVOKE ALL ON FUNCTION public.core_correct_qrc(uuid, uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.core_note_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.core_recalc_result(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.core_correct_qrc_publish(uuid, uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.core_revise_qrc_publish(uuid, uuid, numeric, numeric, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.core_correct_qrc(uuid, uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.core_note_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.core_recalc_result(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.core_correct_qrc_publish(uuid, uuid, numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.core_revise_qrc_publish(uuid, uuid, numeric, numeric, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.core_identite_api_verifiee() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.core_contexte_correction_autorise() FROM authenticated, service_role;
REVOKE ALL ON FUNCTION public.core_contexte_tentative_autorise(uuid) FROM authenticated, service_role;
GRANT USAGE ON SCHEMA public TO ftransport_qrc_cron;
GRANT EXECUTE ON FUNCTION public.core_recalc_result(uuid) TO ftransport_qrc_cron;
-- Le cron de réconciliation doit appeler sa fonction de haut niveau documentée ;
-- aucun accès direct à la correction ni membership pour anon/authenticated/authenticator.
-- Activation BLOQUÉE : prouver les identités de connexion API/IA et provisionner
-- la connexion dédiée du scheduler avant toute application réelle.
