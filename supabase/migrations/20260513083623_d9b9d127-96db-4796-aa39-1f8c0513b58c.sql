CREATE OR REPLACE FUNCTION public.check_max_apprenants_per_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  current_count INTEGER;
  max_apprenants CONSTANT INTEGER := 18;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.session_apprenants
  WHERE session_id = NEW.session_id;

  IF current_count >= max_apprenants THEN
    RAISE EXCEPTION 'Maximum de 18 élèves par session atteint';
  END IF;

  RETURN NEW;
END;
$function$;