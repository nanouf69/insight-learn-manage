CREATE OR REPLACE FUNCTION public.core_note_attempt(p_attempt_id uuid)
 RETURNS TABLE(points_qcm numeric, points_qrc numeric, total numeric, score20 numeric, qrc_restantes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
;
CREATE OR REPLACE FUNCTION public.core_recalc_result(p_attempt_id uuid)
 RETURNS core_exam_results
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
;
CREATE OR REPLACE FUNCTION public.core_contexte_tentative_autorise(p_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT public.core_contexte_correction_autorise()
    OR (p_apprenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.apprenants a
      WHERE a.id = p_apprenant_id AND a.auth_user_id = public.core_identite_api_verifiee()
    ))
$function$
;
CREATE OR REPLACE FUNCTION public.core_contexte_correction_autorise()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN session_user = 'service_role'
      AND coalesce(current_setting('role', true), 'none') IN ('none', 'service_role') THEN true
    WHEN session_user = 'authenticator'
      AND current_setting('role', true) = 'service_role' THEN true
    ELSE coalesce(public.has_role(public.core_identite_api_verifiee(), 'admin'), false)
  END
$function$
;
CREATE OR REPLACE FUNCTION public.core_identite_api_verifiee()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
;
CREATE OR REPLACE FUNCTION public.core_est_proprietaire(p_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = p_apprenant_id AND a.auth_user_id = auth.uid());
$function$
;
CREATE OR REPLACE FUNCTION public.core_log_qrc_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_commentaire text := nullif(current_setting('core.qrc_commentaire', true), '');
  v_operation text := nullif(current_setting('core.qrc_operation_id', true), '');
BEGIN
  IF NEW.etat IS DISTINCT FROM OLD.etat OR NEW.note IS DISTINCT FROM OLD.note THEN
    INSERT INTO public.qrc_correction_events (
      qrc_instance_id, attempt_id, question_id, apprenant_id,
      etat_precedent, etat_nouveau, note_precedente, note_nouvelle,
      commentaire, corrige_par, corrige_email, operation_id
    ) VALUES (
      NEW.qrc_instance_id, NEW.attempt_id, NEW.question_id, NEW.apprenant_id,
      OLD.etat, NEW.etat, OLD.note, NEW.note,
      v_commentaire, NEW.corrige_par, NEW.corrige_email,
      CASE WHEN v_operation IS NULL THEN NULL ELSE v_operation::uuid END
    );
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.enforce_qrc_v2_finality()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'QRC_DELETE_FORBIDDEN: une QRC ne peut pas etre supprimee (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
     OR NEW.question_id IS DISTINCT FROM OLD.question_id
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id THEN
    RAISE EXCEPTION 'QRC_IDENTITY_IMMUTABLE: l''identite d''une QRC est definitive (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  IF OLD.etat = 'corrigee' AND NEW.etat <> 'corrigee' THEN
    RAISE EXCEPTION 'QRC_CORRECTION_FINALE: une QRC corrigee ne peut pas revenir en attente (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.qrc_v2_garde_bareme()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bareme numeric;
  v_nb int;
BEGIN
  IF NEW.note IS NULL OR NEW.note IS NOT DISTINCT FROM OLD.note THEN
    RETURN NEW;
  END IF;
  IF NEW.note < 0 THEN
    RAISE EXCEPTION 'QRC_NOTE_HORS_BAREME: note negative refusee (%).', NEW.qrc_instance_id USING ERRCODE = 'P0478';
  END IF;
  SELECT r.bareme INTO v_bareme FROM public.qrc_bareme_restaure r WHERE r.qrc_instance_id = NEW.qrc_instance_id;
  IF v_bareme IS NULL THEN
    SELECT count(DISTINCT q->>'points'), min((q->>'points')::numeric)
      INTO v_nb, v_bareme
      FROM public.exam_attempts_v2 a, jsonb_array_elements(a.snapshot->'questions') q
     WHERE a.attempt_id = NEW.attempt_id
       AND q->>'id' = NEW.question_id
       AND q->>'points' ~ '^[0-9]+(\.[0-9]+)?$';
    IF v_nb IS DISTINCT FROM 1 THEN v_bareme := NULL; END IF;
  END IF;
  IF v_bareme IS NOT NULL AND v_bareme > 0 AND NEW.note > v_bareme THEN
    RAISE EXCEPTION 'QRC_NOTE_HORS_BAREME: note % superieure au bareme % (%).', NEW.note, v_bareme, NEW.qrc_instance_id USING ERRCODE = 'P0478';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.core_reponse_qrc_vide(p jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT p IS NULL
      OR jsonb_typeof(p) = 'null'
      OR (jsonb_typeof(p) = 'string' AND btrim(p #>> '{}', E' \t\r\n') = '')
      OR (jsonb_typeof(p) = 'array' AND jsonb_array_length(p) = 0)
      OR (jsonb_typeof(p) = 'object' AND p = '{}'::jsonb)
$function$
;
