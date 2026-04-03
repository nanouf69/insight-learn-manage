-- Rolling presence window: use last_action_at (real user actions) instead of fixed checkpoint.
-- This prevents active users from seeing "Êtes-vous là ?" at exactly 30 min.
-- During exams, heartbeat_exam keeps last_seen_at fresh (for RLS) without resetting the window.

-- 1. Add last_action_at column (real user interaction timestamp)
ALTER TABLE public.apprenant_connexions
  ADD COLUMN IF NOT EXISTS last_action_at timestamp with time zone;

-- Backfill: set last_action_at = last_seen_at for existing rows
UPDATE public.apprenant_connexions
  SET last_action_at = COALESCE(last_seen_at, started_at)
  WHERE last_action_at IS NULL;

-- Default for new rows
ALTER TABLE public.apprenant_connexions
  ALTER COLUMN last_action_at SET DEFAULT now();

-- 2. Update check_apprenant_session: rolling window based on last_action_at
CREATE OR REPLACE FUNCTION public.check_apprenant_session(
  _apprenant_id uuid,
  _connexion_id uuid,
  _event text DEFAULT 'heartbeat'::text
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
AS $function$
DECLARE
  v_conn public.apprenant_connexions%ROWTYPE;
  v_now timestamp with time zone := now();
  v_presence_due timestamp with time zone;
  v_presence_deadline timestamp with time zone;
  v_max_end timestamp with time zone;
  v_window interval := interval '30 minutes';
  v_grace interval := interval '5 minutes';
BEGIN
  SELECT * INTO v_conn
  FROM public.apprenant_connexions c
  WHERE c.id = _connexion_id AND c.apprenant_id = _apprenant_id AND c.user_id = auth.uid()
  ORDER BY c.started_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_active_session'::text, false, 0, v_now, NULL::timestamp with time zone;
    RETURN;
  END IF;

  IF v_conn.ended_at IS NOT NULL THEN
    RETURN QUERY SELECT false, COALESCE(v_conn.end_reason, 'already_closed')::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  v_max_end := v_conn.started_at + interval '7 hours';

  -- Max duration: applies even during exams
  IF v_now >= v_max_end THEN
    UPDATE public.apprenant_connexions
      SET ended_at = v_max_end,
          last_seen_at = LEAST(COALESCE(last_seen_at, v_max_end), v_max_end),
          end_reason = 'max_duration',
          updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    RETURN QUERY SELECT false, 'max_duration'::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  -- Update timestamps based on event type
  IF _event IN ('confirm_presence', 'action') THEN
    -- Real user interaction: update both last_seen_at AND last_action_at
    UPDATE public.apprenant_connexions
      SET last_seen_at = v_now,
          last_action_at = v_now,
          updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    v_conn.last_seen_at := v_now;
    v_conn.last_action_at := v_now;

  ELSIF _event IN ('heartbeat', 'heartbeat_exam') THEN
    -- Automatic heartbeat: only update last_seen_at (keeps RLS alive)
    UPDATE public.apprenant_connexions
      SET last_seen_at = v_now,
          updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    v_conn.last_seen_at := v_now;
    -- last_action_at intentionally NOT updated
  END IF;

  -- During exam: skip presence check entirely, session stays valid
  IF _event = 'heartbeat_exam' THEN
    RETURN QUERY SELECT true, NULL::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  -- Rolling presence window based on last real user action
  v_presence_due := COALESCE(v_conn.last_action_at, v_conn.started_at) + v_window;
  v_presence_deadline := v_presence_due + v_grace;

  -- Past deadline: close session for inactivity
  IF v_now >= v_presence_deadline THEN
    UPDATE public.apprenant_connexions
      SET ended_at = v_presence_deadline,
          end_reason = 'no_response',
          updated_at = now()
      WHERE id = v_conn.id AND ended_at IS NULL;
    RETURN QUERY SELECT false, 'no_response'::text, false, 0, v_now, v_conn.started_at;
    RETURN;
  END IF;

  -- Past due but within grace: show prompt
  RETURN QUERY SELECT
    true,
    NULL::text,
    (v_now >= v_presence_due),
    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_presence_deadline - v_now)))::integer),
    v_now,
    v_conn.started_at;
END;
$function$;

-- 3. Update enforce_apprenant_session_limits: rolling window
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
  -- Close sessions where last real action was > 35 min ago (30 min window + 5 min grace)
  WITH closed_no_response_rows AS (
    UPDATE public.apprenant_connexions c
      SET ended_at = COALESCE(c.last_action_at, c.started_at) + interval '35 minutes',
          end_reason = 'no_response',
          updated_at = now()
      WHERE c.ended_at IS NULL
        AND now() >= COALESCE(c.last_action_at, c.started_at) + interval '35 minutes'
      RETURNING 1
  )
  SELECT COUNT(*) INTO v_closed_no_response FROM closed_no_response_rows;

  -- Close sessions past 7-hour max
  WITH closed_max_rows AS (
    UPDATE public.apprenant_connexions c
      SET ended_at = c.started_at + interval '7 hours',
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

-- 4. Update is_current_user_apprenant: rolling window
CREATE OR REPLACE FUNCTION public.is_current_user_apprenant(_apprenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH target_apprenant AS (
    SELECT a.id FROM public.apprenants a
    WHERE a.id = _apprenant_id AND (a.id = auth.uid() OR a.auth_user_id = auth.uid())
    LIMIT 1
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
    WHERE now() < c.started_at + interval '7 hours'
      -- Rolling window: last real action within 35 min (30 + 5 grace)
      AND now() < COALESCE(c.last_action_at, c.started_at) + interval '35 minutes'
  );
$function$;
