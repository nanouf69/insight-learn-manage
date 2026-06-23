CREATE OR REPLACE FUNCTION public.is_current_user_apprenant(_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH target_apprenant AS (
    SELECT a.id FROM public.apprenants a
    WHERE a.id = _apprenant_id AND (a.id = auth.uid() OR a.auth_user_id = auth.uid()) LIMIT 1
  ),
  active_connexion AS (
    SELECT c.started_at, c.last_seen_at, c.last_action_at
    FROM public.apprenant_connexions c
    JOIN target_apprenant ta ON ta.id = c.apprenant_id
    WHERE c.user_id = auth.uid() AND c.ended_at IS NULL
    ORDER BY c.started_at DESC LIMIT 1
  )
  SELECT EXISTS (
    SELECT 1 FROM active_connexion c
    WHERE now() < c.started_at + interval '12 hours'
      AND now() < COALESCE(c.last_action_at, c.started_at) + interval '4 hours 30 minutes'
  );
$function$;

CREATE OR REPLACE FUNCTION public.enforce_apprenant_session_limits()
 RETURNS TABLE(closed_no_response integer, closed_max_duration integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_closed_no_response integer := 0;
  v_closed_max_duration integer := 0;
BEGIN
  WITH closed_no_response_rows AS (
    UPDATE public.apprenant_connexions c
      SET ended_at = COALESCE(c.last_action_at, c.started_at) + interval '4 hours 30 minutes',
          end_reason = 'no_response', updated_at = now()
      WHERE c.ended_at IS NULL
        AND now() >= COALESCE(c.last_action_at, c.started_at) + interval '4 hours 30 minutes'
      RETURNING 1
  )
  SELECT COUNT(*) INTO v_closed_no_response FROM closed_no_response_rows;

  WITH closed_max_rows AS (
    UPDATE public.apprenant_connexions c
      SET ended_at = c.started_at + interval '12 hours',
          end_reason = 'max_duration', updated_at = now()
      WHERE c.ended_at IS NULL
        AND now() >= c.started_at + interval '12 hours'
      RETURNING 1
  )
  SELECT COUNT(*) INTO v_closed_max_duration FROM closed_max_rows;

  RETURN QUERY SELECT v_closed_no_response, v_closed_max_duration;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_apprenant_session(_apprenant_id uuid, _connexion_id uuid, _event text DEFAULT 'heartbeat'::text)
 RETURNS TABLE(is_valid boolean, disconnect_reason text, should_show_presence_prompt boolean, remaining_presence_seconds integer, server_now timestamp with time zone, session_started_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conn public.apprenant_connexions%ROWTYPE;
  v_now timestamp with time zone := now();
  v_presence_due timestamp with time zone;
  v_presence_deadline timestamp with time zone;
  v_max_end timestamp with time zone;
  v_window interval := interval '4 hours';
  v_grace interval := interval '30 minutes';
BEGIN
  SELECT * INTO v_conn FROM public.apprenant_connexions c
  WHERE c.id = _connexion_id AND c.apprenant_id = _apprenant_id AND c.user_id = auth.uid()
  ORDER BY c.started_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_active_session'::text, false, 0, v_now, NULL::timestamp with time zone; RETURN;
  END IF;

  IF v_conn.ended_at IS NOT NULL THEN
    RETURN QUERY SELECT false, COALESCE(v_conn.end_reason, 'already_closed')::text, false, 0, v_now, v_conn.started_at; RETURN;
  END IF;

  v_max_end := v_conn.started_at + interval '12 hours';
  IF v_now >= v_max_end THEN
    UPDATE public.apprenant_connexions SET ended_at = v_max_end,
      last_seen_at = LEAST(COALESCE(last_seen_at, v_max_end), v_max_end),
      end_reason = 'max_duration', updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    RETURN QUERY SELECT false, 'max_duration'::text, false, 0, v_now, v_conn.started_at; RETURN;
  END IF;

  IF _event IN ('confirm_presence', 'action') THEN
    UPDATE public.apprenant_connexions SET last_seen_at = v_now, last_action_at = v_now, updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    v_conn.last_seen_at := v_now; v_conn.last_action_at := v_now;
  ELSIF _event IN ('heartbeat', 'heartbeat_exam') THEN
    UPDATE public.apprenant_connexions SET last_seen_at = v_now, updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    v_conn.last_seen_at := v_now;
  END IF;

  IF _event = 'heartbeat_exam' THEN
    RETURN QUERY SELECT true, NULL::text, false, 0, v_now, v_conn.started_at; RETURN;
  END IF;

  v_presence_due := COALESCE(v_conn.last_action_at, v_conn.started_at) + v_window;
  v_presence_deadline := v_presence_due + v_grace;

  IF v_now >= v_presence_deadline THEN
    UPDATE public.apprenant_connexions SET ended_at = v_presence_deadline,
      end_reason = 'no_response', updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    RETURN QUERY SELECT false, 'no_response'::text, false, 0, v_now, v_conn.started_at; RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, (v_now >= v_presence_due),
    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_presence_deadline - v_now)))::integer),
    v_now, v_conn.started_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_apprenant_connexion(_apprenant_id uuid, _source text DEFAULT 'cours'::text)
 RETURNS TABLE(id uuid, started_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_conn_id uuid;
  v_started_at timestamp with time zone;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = _apprenant_id
      AND a.auth_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT c.id, c.started_at
    INTO v_conn_id, v_started_at
  FROM public.apprenant_connexions c
  WHERE c.apprenant_id = _apprenant_id
    AND c.user_id = v_user_id
    AND c.ended_at IS NULL
    AND now() < c.started_at + interval '12 hours'
    AND now() < COALESCE(c.last_action_at, c.started_at) + interval '4 hours 30 minutes'
  ORDER BY c.started_at DESC
  LIMIT 1;

  IF v_conn_id IS NOT NULL THEN
    UPDATE public.apprenant_connexions
    SET last_seen_at = now(),
        updated_at = now(),
        source = COALESCE(NULLIF(_source, ''), source, 'cours')
    WHERE apprenant_connexions.id = v_conn_id;

    RETURN QUERY SELECT v_conn_id, v_started_at;
    RETURN;
  END IF;

  UPDATE public.apprenant_connexions c
  SET ended_at = now(),
      last_seen_at = COALESCE(c.last_seen_at, now()),
      end_reason = 'replaced_by_new_session',
      updated_at = now()
  WHERE c.apprenant_id = _apprenant_id
    AND c.user_id = v_user_id
    AND c.ended_at IS NULL;

  INSERT INTO public.apprenant_connexions (
    apprenant_id,
    user_id,
    source,
    started_at,
    last_seen_at,
    last_action_at
  )
  VALUES (
    _apprenant_id,
    v_user_id,
    COALESCE(NULLIF(_source, ''), 'cours'),
    now(),
    now(),
    now()
  )
  RETURNING apprenant_connexions.id, apprenant_connexions.started_at
  INTO v_conn_id, v_started_at;

  RETURN QUERY SELECT v_conn_id, v_started_at;
END;
$function$;