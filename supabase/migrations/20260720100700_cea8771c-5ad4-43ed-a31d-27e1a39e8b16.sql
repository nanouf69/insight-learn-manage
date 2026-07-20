
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
  tol_nom int;
  tol_prenom int;
BEGIN
  norm_nom := lower(public.unaccent(regexp_replace(trim(coalesce(p_nom,'')), '[-'']', ' ', 'g')));
  norm_prenom := lower(public.unaccent(regexp_replace(trim(coalesce(p_prenom,'')), '[-'']', ' ', 'g')));
  norm_nom := regexp_replace(norm_nom, '\s+', ' ', 'g');
  norm_prenom := regexp_replace(norm_prenom, '\s+', ' ', 'g');

  IF length(norm_nom) < 2 OR length(norm_prenom) < 2 THEN
    RETURN;
  END IF;

  tol_nom := GREATEST(1, length(norm_nom) / 3);
  tol_prenom := GREATEST(1, length(norm_prenom) / 3);

  RETURN QUERY
  WITH base AS (
    SELECT a.id, a.nom, a.prenom, a.email, a.telephone, a.adresse, a.code_postal, a.ville,
           lower(public.unaccent(regexp_replace(coalesce(a.nom,''), '[-'']', ' ', 'g'))) AS n_nom,
           lower(public.unaccent(regexp_replace(coalesce(a.prenom,''), '[-'']', ' ', 'g'))) AS n_prenom
    FROM apprenants a
    WHERE a.deleted_at IS NULL
  ),
  scored AS (
    SELECT b.*,
      CASE
        -- Exact both
        WHEN b.n_nom = norm_nom AND b.n_prenom = norm_prenom THEN 0
        -- Swapped exact
        WHEN b.n_nom = norm_prenom AND b.n_prenom = norm_nom THEN 1
        -- Fuzzy both
        WHEN public.levenshtein(b.n_nom, norm_nom) <= tol_nom
          AND public.levenshtein(b.n_prenom, norm_prenom) <= tol_prenom THEN 2
        -- Fuzzy swapped
        WHEN public.levenshtein(b.n_nom, norm_prenom) <= tol_prenom
          AND public.levenshtein(b.n_prenom, norm_nom) <= tol_nom THEN 3
        -- Contained (composite names like "hamid arga")
        WHEN (b.n_nom LIKE '%' || norm_nom || '%' OR norm_nom LIKE '%' || b.n_nom || '%')
          AND (b.n_prenom LIKE '%' || norm_prenom || '%' OR norm_prenom LIKE '%' || b.n_prenom || '%') THEN 4
        -- Contained swapped
        WHEN (b.n_nom LIKE '%' || norm_prenom || '%' OR norm_prenom LIKE '%' || b.n_nom || '%')
          AND (b.n_prenom LIKE '%' || norm_nom || '%' OR norm_nom LIKE '%' || b.n_prenom || '%') THEN 5
        -- Nom exact, prénom contient
        WHEN b.n_nom = norm_nom AND (b.n_prenom LIKE norm_prenom || '%' OR norm_prenom LIKE b.n_prenom || '%') THEN 6
        WHEN b.n_prenom = norm_prenom AND (b.n_nom LIKE norm_nom || '%' OR norm_nom LIKE b.n_nom || '%') THEN 6
        ELSE 99
      END AS score
    FROM base b
  )
  SELECT s.id, s.nom, s.prenom, s.email, s.telephone, s.adresse, s.code_postal, s.ville
  FROM scored s
  WHERE s.score < 99
  ORDER BY s.score ASC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) TO anon, authenticated;
