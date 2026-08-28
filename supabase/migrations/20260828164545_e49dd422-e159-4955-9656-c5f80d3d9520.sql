CREATE OR REPLACE FUNCTION public.check_max_apprenants_per_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  max_apprenants CONSTANT INTEGER := 18;
  v_type text;
BEGIN
  SELECT type_session INTO v_type FROM public.sessions WHERE id = NEW.session_id;

  -- Les sessions d'examen théorique regroupent tous les candidats : pas de limite
  IF COALESCE(v_type, '') = 'examen' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.session_apprenants
  WHERE session_id = NEW.session_id;

  IF current_count >= max_apprenants THEN
    RAISE EXCEPTION 'Maximum de 18 élèves par session atteint';
  END IF;

  RETURN NEW;
END;
$function$;