CREATE OR REPLACE FUNCTION public.check_apprenant_session(
  _apprenant_id uuid,
  _connexion_id uuid,
  _event text DEFAULT 'heartbeat'
)
RETURNS TABLE (
  is_valid boolean,
  disconnect_reason text,
  should_show_presence_prompt boolean,
  remaining_presence_seconds integer,
  server_now timestamp with time zone,
  session_started_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn public.apprenant_connexions%ROWTYPE;
  v_now timestamp with time zone := now();
  v_presence_due timestamp with time zone;
  v_presence_deadline timestamp with time zone;
  v_max_end timestamp with time zone;
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
    SELECT false, 'already_closed'::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  v_presence_due := v_conn.started_at + interval '4 hours';
  v_presence_deadline := v_presence_due + interval '10 minutes';
  v_max_end := v_conn.started_at + interval '7 hours';

  IF v_now >= v_max_end THEN
    UPDATE public.apprenant_connexions
    SET
      ended_at = v_max_end,
      last_seen_at = LEAST(COALESCE(last_seen_at, v_max_end), v_max_end),
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
      ended_at = LEAST(v_now, v_max_end),
      last_seen_at = LEAST(COALESCE(last_seen_at, v_presence_due), LEAST(v_now, v_max_end)),
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
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_apprenant(_apprenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH target_apprenant AS (
    SELECT a.id
    FROM public.apprenants a
    WHERE a.id = _apprenant_id
      AND (a.id = auth.uid() OR a.auth_user_id = auth.uid())
    LIMIT 1
  ),
  active_connexion AS (
    SELECT c.started_at, c.last_seen_at
    FROM public.apprenant_connexions c
    JOIN target_apprenant ta ON ta.id = c.apprenant_id
    WHERE c.user_id = auth.uid()
      AND c.ended_at IS NULL
    ORDER BY c.started_at DESC
    LIMIT 1
  )
  SELECT EXISTS (
    SELECT 1
    FROM active_connexion c
    WHERE now() < c.started_at + interval '7 hours'
      AND (
        now() < c.started_at + interval '4 hours 10 minutes'
        OR c.last_seen_at >= c.started_at + interval '4 hours'
      )
  );
$function$;