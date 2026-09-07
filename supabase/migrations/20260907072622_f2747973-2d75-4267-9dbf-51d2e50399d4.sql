CREATE OR REPLACE FUNCTION public.update_own_apprenant_coordonnees(
  _apprenant_id uuid,
  _email text,
  _telephone text,
  _adresse text,
  _code_postal text,
  _ville text
)
RETURNS public.apprenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result public.apprenants;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized for this apprenant';
  END IF;

  UPDATE public.apprenants
  SET email = COALESCE(NULLIF(btrim(_email), ''), email),
      telephone = COALESCE(NULLIF(btrim(_telephone), ''), telephone),
      adresse = COALESCE(NULLIF(btrim(_adresse), ''), adresse),
      code_postal = COALESCE(NULLIF(btrim(_code_postal), ''), code_postal),
      ville = COALESCE(NULLIF(btrim(_ville), ''), ville)
  WHERE id = _apprenant_id
  RETURNING * INTO result;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_own_apprenant_coordonnees(uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_own_apprenant_coordonnees(uuid, text, text, text, text, text) TO authenticated, service_role;