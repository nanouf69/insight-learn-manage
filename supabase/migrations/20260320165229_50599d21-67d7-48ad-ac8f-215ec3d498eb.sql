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
    RETURN QUERY SELECT true, v_conn.ended_at, 'already_closed'::text;
    RETURN;
  END IF;

  v_end := LEAST(now(), v_conn.started_at + interval '7 hours');

  UPDATE public.apprenant_connexions
  SET
    ended_at = v_end,
    last_seen_at = LEAST(COALESCE(last_seen_at, v_end), v_end),
    updated_at = now()
  WHERE id = v_conn.id
    AND ended_at IS NULL
  RETURNING apprenant_connexions.ended_at INTO v_end;

  RETURN QUERY SELECT true, v_end, 'closed'::text;
END;
$$;