-- 1..3 : retirer le droit d'exécution aux visiteurs non connectés (aucune donnée touchée)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_own_apprenant_coordonnees(uuid, text, text, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_module_pages_progress(uuid, integer, jsonb, integer) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_own_apprenant_coordonnees(uuid, text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_module_pages_progress(uuid, integer, jsonb, integer) TO authenticated, service_role;

-- 4 : log_error reste accessible sans connexion (pages publiques) mais borné
CREATE OR REPLACE FUNCTION public.log_error(_message text, _level text DEFAULT 'error'::text, _source text DEFAULT 'client'::text, _stack text DEFAULT NULL::text, _component_stack text DEFAULT NULL::text, _url text DEFAULT NULL::text, _route text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _user_id uuid DEFAULT NULL::uuid, _user_email text DEFAULT NULL::text, _context jsonb DEFAULT NULL::jsonb, _fingerprint text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id UUID;
  _fp TEXT;
  _recent_new INTEGER;
BEGIN
  -- bornes anti-abus sur la taille des champs (aucune perte de donnée existante)
  _message := left(COALESCE(_message, ''), 2000);
  _stack := left(_stack, 8000);
  _component_stack := left(_component_stack, 8000);
  _url := left(_url, 1000);
  _route := left(_route, 500);
  _user_agent := left(_user_agent, 500);
  _user_email := left(_user_email, 320);
  _source := left(COALESCE(_source, 'client'), 100);
  _level := left(COALESCE(_level, 'error'), 50);

  _fp := COALESCE(_fingerprint, md5(COALESCE(_route,'') || '|' || _message));
  _fp := left(_fp, 200);

  SELECT id INTO _existing_id
  FROM public.error_logs
  WHERE fingerprint = _fp
    AND resolved = false
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.error_logs
    SET count = count + 1,
        last_seen_at = now(),
        user_id = COALESCE(user_id, _user_id),
        user_email = COALESCE(user_email, _user_email)
    WHERE id = _existing_id;
    RETURN _existing_id;
  END IF;

  -- plafond de nouvelles entrées distinctes par heure pour les appels non connectés
  IF auth.uid() IS NULL THEN
    SELECT count(*) INTO _recent_new
    FROM public.error_logs
    WHERE created_at > now() - interval '1 hour';

    IF _recent_new >= 500 THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.error_logs (
    level, source, message, stack, component_stack, url, route,
    user_agent, user_id, user_email, context, fingerprint
  ) VALUES (
    _level, _source, _message, _stack, _component_stack, _url, _route,
    _user_agent, _user_id, _user_email, _context, _fp
  ) RETURNING id INTO _existing_id;

  RETURN _existing_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_error(text,text,text,text,text,text,text,text,uuid,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_error(text,text,text,text,text,text,text,text,uuid,text,jsonb,text) TO anon, authenticated, service_role;