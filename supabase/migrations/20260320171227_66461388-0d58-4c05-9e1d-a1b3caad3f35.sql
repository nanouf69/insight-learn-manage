ALTER TABLE public.apprenant_connexions
ADD COLUMN IF NOT EXISTS end_reason text;

CREATE INDEX IF NOT EXISTS idx_apprenant_connexions_open_started
ON public.apprenant_connexions (started_at)
WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_apprenant_connexions_open_last_seen
ON public.apprenant_connexions (last_seen_at)
WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_apprenant_session_limits()
RETURNS TABLE(closed_no_response integer, closed_max_duration integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_closed_no_response integer := 0;
  v_closed_max_duration integer := 0;
BEGIN
  WITH closed_no_response_rows AS (
    UPDATE public.apprenant_connexions c
    SET
      ended_at = c.started_at + interval '4 hours 10 minutes',
      last_seen_at = LEAST(COALESCE(c.last_seen_at, c.started_at + interval '4 hours'), c.started_at + interval '4 hours'),
      end_reason = 'no_response',
      updated_at = now()
    WHERE c.ended_at IS NULL
      AND now() >= c.started_at + interval '4 hours 10 minutes'
      AND c.last_seen_at < c.started_at + interval '4 hours'
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
$$;

CREATE OR REPLACE FUNCTION public.close_apprenant_connexion(
  _connexion_id uuid,
  _apprenant_id uuid DEFAULT NULL
)
RETURNS TABLE(closed boolean, ended_at timestamp with time zone, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conn public.apprenant_connexions%ROWTYPE;
  v_end timestamp with time zone;
  v_reason text;
BEGIN
  SELECT *
  INTO v_conn
  FROM public.apprenant_connexions c
  WHERE c.id = _connexion_id
    AND (_apprenant_id IS NULL OR c.apprenant_id = _apprenant_id)
    AND (
      c.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::timestamp with time zone, 'not_found_or_forbidden'::text;
    RETURN;
  END IF;

  IF v_conn.ended_at IS NOT NULL THEN
    RETURN QUERY SELECT true, v_conn.ended_at, COALESCE(v_conn.end_reason, 'already_closed')::text;
    RETURN;
  END IF;

  v_end := LEAST(now(), v_conn.started_at + interval '7 hours');
  v_reason := CASE WHEN v_end = v_conn.started_at + interval '7 hours' THEN 'max_duration' ELSE 'manual_close' END;

  UPDATE public.apprenant_connexions
  SET
    ended_at = v_end,
    last_seen_at = LEAST(COALESCE(last_seen_at, v_end), v_end),
    end_reason = v_reason,
    updated_at = now()
  WHERE id = v_conn.id
    AND ended_at IS NULL
  RETURNING apprenant_connexions.ended_at INTO v_end;

  RETURN QUERY SELECT true, v_end, v_reason;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_apprenant_session(
  _apprenant_id uuid,
  _connexion_id uuid,
  _event text DEFAULT 'heartbeat'
)
RETURNS TABLE(
  is_valid boolean,
  disconnect_reason text,
  should_show_presence_prompt boolean,
  remaining_presence_seconds integer,
  server_now timestamp with time zone,
  session_started_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    SELECT false, COALESCE(v_conn.end_reason, 'already_closed')::text, false, 0, v_now, v_conn.started_at;
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
$$;

UPDATE public.apprenant_connexions
SET end_reason = CASE
  WHEN ended_at IS NULL THEN NULL
  WHEN ended_at >= started_at + interval '7 hours' THEN 'max_duration'
  WHEN ended_at >= started_at + interval '4 hours 10 minutes' AND last_seen_at < started_at + interval '4 hours' THEN 'no_response'
  ELSE 'manual_close'
END
WHERE end_reason IS NULL;

SELECT public.enforce_apprenant_session_limits();

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'enforce-apprenant-session-limits'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    PERFORM cron.schedule(
      'enforce-apprenant-session-limits',
      '* * * * *',
      $cron$SELECT public.enforce_apprenant_session_limits();$cron$
    );
  END IF;
END
$$;