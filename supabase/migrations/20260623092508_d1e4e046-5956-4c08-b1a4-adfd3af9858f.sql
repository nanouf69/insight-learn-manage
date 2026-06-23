CREATE OR REPLACE FUNCTION public.close_apprenant_connexion(_connexion_id uuid, _apprenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(closed boolean, ended_at timestamp with time zone, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_end := LEAST(now(), v_conn.started_at + interval '12 hours');
  v_reason := CASE WHEN v_end = v_conn.started_at + interval '12 hours' THEN 'max_duration' ELSE 'manual_close' END;

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
$function$;