CREATE OR REPLACE FUNCTION public.protect_module_completion_terminal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_privileged BOOLEAN;
BEGIN
  is_privileged := (current_setting('role', true) = 'service_role')
                   OR public.has_role(auth.uid(), 'admin');

  NEW.updated_at := now();

  IF OLD.status = 'completed' THEN
    IF is_privileged AND NEW.status <> 'completed' THEN
      RETURN NEW;
    END IF;

    NEW.status := 'completed';
    NEW.progress := GREATEST(COALESCE(NEW.progress, 0), COALESCE(OLD.progress, 100), 100);
    NEW.completed_at := COALESCE(OLD.completed_at, NEW.completed_at, now());
    IF NEW.score_obtenu IS NULL THEN NEW.score_obtenu := OLD.score_obtenu; END IF;
    IF NEW.score_max IS NULL THEN NEW.score_max := OLD.score_max; END IF;
    -- Le détail d'une validation existante est la preuve de fin : jamais remplacé
    -- par un détail courant, quel que soit l'appelant (remise à zéro délibérée exceptée).
    IF jsonb_typeof(OLD.details) = 'array' AND jsonb_array_length(OLD.details) > 0 THEN
      NEW.details := OLD.details;
    ELSIF NEW.details IS NULL OR jsonb_typeof(NEW.details) <> 'array' THEN
      NEW.details := OLD.details;
    END IF;
    RETURN NEW;
  END IF;

  NEW.progress := GREATEST(COALESCE(NEW.progress, 0), COALESCE(OLD.progress, 0));
  IF NEW.status = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.progress := 100;
  END IF;
  RETURN NEW;
END;
$function$;