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
      AND now() < COALESCE(c.last_action_at, c.started_at) + interval '35 minutes'
  );
$function$

;
