CREATE OR REPLACE FUNCTION public.est_compte_test(_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id = _apprenant_id);
$function$

;
