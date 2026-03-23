
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
  v_hour_now integer;
  v_presence_interval interval;
BEGIN
  SELECT *
  INTO v_conn
  FROM public.apprenant_connexions c
  WHERE c.id = _connexion_id
    AND c.apprenant_id = _apprenant_id
    AND c.user_id = auth.uid()
  ORDER BY c.started_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT false, 'no_active_session'::text, false, 0, v_now, NULL::timestamp with time zone;
    RETURN;
  END IF;

  IF v_conn.ended_at IS NOT NULL THEN
    RETURN QUERY
    SELECT false, COALESCE(v_conn.end_reason, 'already_closed')::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  v_hour_now := EXTRACT(HOUR FROM v_now AT TIME ZONE 'Europe/Paris')::integer;
  IF v_hour_now >= 22 OR v_hour_now < 5 THEN
    v_presence_interval := interval '2 hours';
  ELSE
    v_presence_interval := interval '4 hours';
  END IF;

  v_presence_due := v_conn.started_at + v_presence_interval;
  v_presence_deadline := v_presence_due + interval '10 minutes';
  v_max_end := v_conn.started_at + interval '7 hours';

  IF v_now >= v_max_end THEN
    UPDATE public.apprenant_connexions
    SET
      ended_at = v_max_end,
      last_seen_at = LEAST(COALESCE(last_seen_at, v_max_end), v_max_end),
      end_reason = 'max_duration',
      updated_at = now()
    WHERE id = v_conn.id
      AND ended_at IS NULL;

    RETURN QUERY
    SELECT false, 'max_duration'::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  IF _event = 'confirm_presence' THEN
    UPDATE public.apprenant_connexions
    SET
      last_seen_at = v_now,
      updated_at = now()
    WHERE id = v_conn.id
      AND ended_at IS NULL;

    v_conn.last_seen_at := v_now;
  ELSIF _event IN ('heartbeat', 'action') THEN
    IF v_now < v_presence_due OR v_conn.last_seen_at >= v_presence_due THEN
      UPDATE public.apprenant_connexions
      SET
        last_seen_at = v_now,
        updated_at = now()
      WHERE id = v_conn.id
        AND ended_at IS NULL;

      v_conn.last_seen_at := v_now;
    END IF;
  END IF;

  IF v_now >= v_presence_deadline AND v_conn.last_seen_at < v_presence_due THEN
    UPDATE public.apprenant_connexions
    SET
      ended_at = v_presence_deadline,
      last_seen_at = LEAST(COALESCE(last_seen_at, v_presence_due), v_presence_due),
      end_reason = 'no_response',
      updated_at = now()
    WHERE id = v_conn.id
      AND ended_at IS NULL;

    RETURN QUERY
    SELECT false, 'no_response'::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    true,
    NULL::text,
    (v_now >= v_presence_due AND v_conn.last_seen_at < v_presence_due),
    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_presence_deadline - v_now)))::integer),
    v_now,
    v_conn.started_at;
END;
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
  v_hour_now integer;
  v_presence_interval interval;
BEGIN
  v_hour_now := EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/Paris')::integer;
  IF v_hour_now >= 22 OR v_hour_now < 5 THEN
    v_presence_interval := interval '2 hours';
  ELSE
    v_presence_interval := interval '4 hours';
  END IF;

  WITH closed_no_response_rows AS (
    UPDATE public.apprenant_connexions c
    SET
      ended_at = c.started_at + v_presence_interval + interval '10 minutes',
      last_seen_at = LEAST(COALESCE(c.last_seen_at, c.started_at + v_presence_interval), c.started_at + v_presence_interval),
      end_reason = 'no_response',
      updated_at = now()
    WHERE c.ended_at IS NULL
      AND now() >= c.started_at + v_presence_interval + interval '10 minutes'
      AND c.last_seen_at < c.started_at + v_presence_interval
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_closed_no_response FROM closed_no_response_rows;

  WITH closed_max_rows AS (
    UPDATE public.apprenant_connexions c
    SET
      ended_at = c.started_at + interval '7 hours',
      last_seen_at = LEAST(COALESCE(c.last_seen_at, c.started_at + interval '7 hours'), c.started_at + interval '7 hours'),
      end_reason = 'max_duration',
      updated_at = now()
    WHERE c.ended_at IS NULL
      AND now() >= c.started_at + interval '7 hours'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_closed_max_duration FROM closed_max_rows;

  RETURN QUERY SELECT v_closed_no_response, v_closed_max_duration;
END;
$function$;
