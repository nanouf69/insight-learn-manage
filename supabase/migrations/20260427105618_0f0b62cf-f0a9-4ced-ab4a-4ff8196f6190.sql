CREATE OR REPLACE FUNCTION public.start_apprenant_connexion(
  _apprenant_id uuid,
  _source text DEFAULT 'cours'
)
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

GRANT EXECUTE ON FUNCTION public.start_apprenant_connexion(uuid, text) TO authenticated;

UPDATE public.apprenant_connexions c
SET ended_at = now(),
    last_seen_at = COALESCE(c.last_seen_at, now()),
    end_reason = 'support_cleanup',
    updated_at = now()
WHERE c.apprenant_id = '639cea0b-124a-4d68-803a-0e44760a6127'::uuid
  AND c.ended_at IS NULL;