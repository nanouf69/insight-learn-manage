
ALTER TABLE public.apprenant_connexions ADD COLUMN IF NOT EXISTS user_agent text;

CREATE OR REPLACE FUNCTION public.get_active_apprenant_connexion_info(_apprenant_id uuid, _client_session_id text DEFAULT NULL)
 RETURNS TABLE(ip_address text, user_agent text, started_at timestamp with time zone, last_seen_at timestamp with time zone, source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = v_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.ip_address, c.user_agent, c.started_at, c.last_seen_at, c.source
  FROM public.apprenant_connexions c
  WHERE c.apprenant_id = _apprenant_id
    AND c.user_id = v_user_id
    AND c.ended_at IS NULL
    AND now() < c.started_at + interval '12 hours'
    AND c.last_seen_at > now() - interval '2 minutes'
    AND (_client_session_id IS NULL OR c.client_session_id IS DISTINCT FROM _client_session_id)
  ORDER BY c.last_seen_at DESC
  LIMIT 1;
END;
$function$;
