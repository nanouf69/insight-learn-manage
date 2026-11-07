CREATE OR REPLACE FUNCTION public.shared_exercice_key(e jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(e->>'id','') || '::' || coalesce(
    nullif(btrim(coalesce(e->>'matiereKey','')), ''),
    regexp_replace(lower(coalesce(e->>'titre','')), '[^a-z0-9]+', '', 'g'),
    ''
  )
$function$

;
CREATE OR REPLACE FUNCTION public.shared_exercice_strict_key(e jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN nullif(btrim(coalesce(e->>'matiereKey','')), '') IS NULL THEN NULL
    ELSE coalesce(e->>'id','') || '::' || btrim(e->>'matiereKey')
  END
$function$

;
CREATE OR REPLACE FUNCTION public.jsonb_as_array(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN jsonb_typeof(p) = 'array' THEN p ELSE '[]'::jsonb END
$function$

;
