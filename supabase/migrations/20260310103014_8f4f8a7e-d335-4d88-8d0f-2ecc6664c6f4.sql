
CREATE OR REPLACE FUNCTION public.search_apprenant_onboarding(
  p_nom text,
  p_prenom text
)
RETURNS TABLE(
  id uuid,
  nom text,
  prenom text,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_nom text;
  norm_prenom text;
  found_row record;
BEGIN
  norm_nom := lower(public.unaccent(trim(p_nom)));
  norm_prenom := lower(public.unaccent(trim(p_prenom)));
  
  -- Exact normalized match
  SELECT a.id, a.nom, a.prenom, a.email, a.telephone, a.adresse, a.code_postal, a.ville
  INTO found_row
  FROM apprenants a
  WHERE lower(public.unaccent(a.nom)) = norm_nom
    AND lower(public.unaccent(a.prenom)) = norm_prenom
  LIMIT 1;
  
  IF found_row IS NOT NULL THEN
    RETURN QUERY SELECT found_row.id, found_row.nom, found_row.prenom, found_row.email, found_row.telephone, found_row.adresse, found_row.code_postal, found_row.ville;
    RETURN;
  END IF;
  
  -- Fuzzy match with Levenshtein
  RETURN QUERY
  SELECT a.id, a.nom, a.prenom, a.email, a.telephone, a.adresse, a.code_postal, a.ville
  FROM apprenants a
  WHERE public.levenshtein(lower(public.unaccent(a.nom)), norm_nom) <= GREATEST(1, length(norm_nom) / 3)
    AND public.levenshtein(lower(public.unaccent(a.prenom)), norm_prenom) <= GREATEST(1, length(norm_prenom) / 3)
  LIMIT 1;
END;
$$;
