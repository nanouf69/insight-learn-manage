
ALTER TABLE public.apprenant_connexions ADD COLUMN IF NOT EXISTS client_session_id text;

CREATE OR REPLACE FUNCTION public.start_apprenant_connexion(_apprenant_id uuid, _source text DEFAULT 'cours'::text, _client_session_id text DEFAULT NULL)
 RETURNS TABLE(id uuid, started_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_conn_id uuid;
  v_started_at timestamp with time zone;
  v_existing_client text;
  v_existing_seen timestamp with time zone;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  -- Reuse an existing active session for the SAME client (same tab/device)
  SELECT c.id, c.started_at
    INTO v_conn_id, v_started_at
  FROM public.apprenant_connexions c
  WHERE c.apprenant_id = _apprenant_id
    AND c.user_id = v_user_id
    AND c.ended_at IS NULL
    AND now() < c.started_at + interval '12 hours'
    AND now() < COALESCE(c.last_action_at, c.started_at) + interval '4 hours 30 minutes'
    AND (_client_session_id IS NOT NULL AND c.client_session_id = _client_session_id)
  ORDER BY c.started_at DESC
  LIMIT 1;

  IF v_conn_id IS NOT NULL THEN
    UPDATE public.apprenant_connexions
    SET last_seen_at = now(), last_action_at = now(), updated_at = now(),
        source = COALESCE(NULLIF(_source, ''), source, 'cours')
    WHERE apprenant_connexions.id = v_conn_id;
    RETURN QUERY SELECT v_conn_id, v_started_at;
    RETURN;
  END IF;

  -- Check for another active session from a DIFFERENT client (still recent heartbeat)
  SELECT c.client_session_id, c.last_seen_at
    INTO v_existing_client, v_existing_seen
  FROM public.apprenant_connexions c
  WHERE c.apprenant_id = _apprenant_id
    AND c.user_id = v_user_id
    AND c.ended_at IS NULL
    AND now() < c.started_at + interval '12 hours'
    AND c.last_seen_at > now() - interval '2 minutes'
    AND (_client_session_id IS NULL OR c.client_session_id IS DISTINCT FROM _client_session_id)
  ORDER BY c.last_seen_at DESC
  LIMIT 1;

  IF v_existing_client IS NOT NULL OR v_existing_seen IS NOT NULL THEN
    RAISE EXCEPTION 'already_connected' USING ERRCODE = 'P0001';
  END IF;

  -- Close any stale sessions for this user (heartbeat > 2 min old or same client)
  UPDATE public.apprenant_connexions c
  SET ended_at = now(),
      last_seen_at = COALESCE(c.last_seen_at, now()),
      end_reason = 'replaced_by_new_session',
      updated_at = now()
  WHERE c.apprenant_id = _apprenant_id
    AND c.user_id = v_user_id
    AND c.ended_at IS NULL;

  INSERT INTO public.apprenant_connexions (
    apprenant_id, user_id, source, started_at, last_seen_at, last_action_at, client_session_id
  ) VALUES (
    _apprenant_id, v_user_id, COALESCE(NULLIF(_source, ''), 'cours'),
    now(), now(), now(), _client_session_id
  )
  RETURNING apprenant_connexions.id, apprenant_connexions.started_at
  INTO v_conn_id, v_started_at;

  RETURN QUERY SELECT v_conn_id, v_started_at;
END;
$function$;
