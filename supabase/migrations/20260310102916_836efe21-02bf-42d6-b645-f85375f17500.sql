
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
BEGIN
  -- Normalize input: lowercase, remove accents, replace hyphens/apostrophes
  norm_nom := lower(unaccent(trim(p_nom)));
  norm_prenom := lower(unaccent(trim(p_prenom)));
  
  -- Search with normalized comparison
  RETURN QUERY
  SELECT 
    a.id,
    a.nom,
    a.prenom,
    a.email,
    a.telephone,
    a.adresse,
    a.code_postal,
    a.ville
  FROM apprenants a
  WHERE lower(unaccent(a.nom)) = norm_nom
    AND lower(unaccent(a.prenom)) = norm_prenom
  LIMIT 1;
  
  -- If not found, try with similarity (Levenshtein)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      a.id,
      a.nom,
      a.prenom,
      a.email,
      a.telephone,
      a.adresse,
      a.code_postal,
      a.ville
    FROM apprenants a
    WHERE levenshtein(lower(unaccent(a.nom)), norm_nom) <= GREATEST(1, length(norm_nom) / 3)
      AND levenshtein(lower(unaccent(a.prenom)), norm_prenom) <= GREATEST(1, length(norm_prenom) / 3)
    LIMIT 1;
  END IF;
END;
$$;
