CREATE OR REPLACE FUNCTION public.est_proprietaire_apprenant(_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid());
$function$

;
