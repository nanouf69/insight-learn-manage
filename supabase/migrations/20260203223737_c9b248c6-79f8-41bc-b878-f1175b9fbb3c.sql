-- Create a function to check the maximum number of apprenants per session
CREATE OR REPLACE FUNCTION public.check_max_apprenants_per_session()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_apprenants CONSTANT INTEGER := 18;
BEGIN
  -- Count current apprenants in the session
  SELECT COUNT(*) INTO current_count
  FROM public.session_apprenants
  WHERE session_id = NEW.session_id;
  
  -- Check if adding this one would exceed the limit
  IF current_count >= max_apprenants THEN
    RAISE EXCEPTION 'Maximum de 18 élèves par session atteint';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit
DROP TRIGGER IF EXISTS enforce_max_apprenants ON public.session_apprenants;
CREATE TRIGGER enforce_max_apprenants
  BEFORE INSERT ON public.session_apprenants
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_apprenants_per_session();

-- Update places_disponibles default to 18 for new sessions
ALTER TABLE public.sessions 
ALTER COLUMN places_disponibles SET DEFAULT 18;