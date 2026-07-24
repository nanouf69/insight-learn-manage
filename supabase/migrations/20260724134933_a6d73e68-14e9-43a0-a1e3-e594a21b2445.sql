
CREATE OR REPLACE FUNCTION public.search_apprenant_onboarding(p_nom text, p_prenom text)
RETURNS TABLE(id uuid, nom text, prenom text, email text, telephone text, adresse text, code_postal text, ville text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Tolérance plus généreuse pour les fautes de frappe (moitié de la longueur)
  tol_nom := GREATEST(2, length(norm_nom) / 2);
  tol_prenom := GREATEST(2, length(norm_prenom) / 2);

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
        -- 0 exact both
        WHEN b.n_nom = norm_nom AND b.n_prenom = norm_prenom THEN 0
        -- 1 swapped exact
        WHEN b.n_nom = norm_prenom AND b.n_prenom = norm_nom THEN 1
        -- 2 fuzzy both (Levenshtein tolerant)
        WHEN public.levenshtein(b.n_nom, norm_nom) <= tol_nom
          AND public.levenshtein(b.n_prenom, norm_prenom) <= tol_prenom THEN 2
        -- 3 fuzzy swapped
        WHEN public.levenshtein(b.n_nom, norm_prenom) <= tol_prenom
          AND public.levenshtein(b.n_prenom, norm_nom) <= tol_nom THEN 3
        -- 4 contained
        WHEN (b.n_nom LIKE '%' || norm_nom || '%' OR norm_nom LIKE '%' || b.n_nom || '%')
          AND (b.n_prenom LIKE '%' || norm_prenom || '%' OR norm_prenom LIKE '%' || b.n_prenom || '%') THEN 4
        -- 5 contained swapped
        WHEN (b.n_nom LIKE '%' || norm_prenom || '%' OR norm_prenom LIKE '%' || b.n_nom || '%')
          AND (b.n_prenom LIKE '%' || norm_nom || '%' OR norm_nom LIKE '%' || b.n_prenom || '%') THEN 5
        -- 6 nom exact + prénom prefix (ou l'inverse)
        WHEN b.n_nom = norm_nom AND (b.n_prenom LIKE norm_prenom || '%' OR norm_prenom LIKE b.n_prenom || '%') THEN 6
        WHEN b.n_prenom = norm_prenom AND (b.n_nom LIKE norm_nom || '%' OR norm_nom LIKE b.n_nom || '%') THEN 6
        -- 7 phonétique : soundex identique sur nom ET prénom (attrape "zaouia" ↔ "zouaoui")
        WHEN public.soundex(b.n_nom) = public.soundex(norm_nom)
          AND public.soundex(b.n_prenom) = public.soundex(norm_prenom) THEN 7
        -- 8 phonétique swappée
        WHEN public.soundex(b.n_nom) = public.soundex(norm_prenom)
          AND public.soundex(b.n_prenom) = public.soundex(norm_nom) THEN 8
        -- 9 dmetaphone identique sur les deux
        WHEN public.dmetaphone(b.n_nom) = public.dmetaphone(norm_nom)
          AND public.dmetaphone(b.n_prenom) = public.dmetaphone(norm_prenom) THEN 9
        -- 10 dmetaphone swappé
        WHEN public.dmetaphone(b.n_nom) = public.dmetaphone(norm_prenom)
          AND public.dmetaphone(b.n_prenom) = public.dmetaphone(norm_nom) THEN 10
        -- 11 prénom exact + nom phonétique proche (fautes lourdes sur le nom)
        WHEN b.n_prenom = norm_prenom
          AND (public.soundex(b.n_nom) = public.soundex(norm_nom)
               OR public.dmetaphone(b.n_nom) = public.dmetaphone(norm_nom)
               OR public.levenshtein(b.n_nom, norm_nom) <= tol_nom + 1) THEN 11
        -- 12 nom exact + prénom phonétique proche
        WHEN b.n_nom = norm_nom
          AND (public.soundex(b.n_prenom) = public.soundex(norm_prenom)
               OR public.dmetaphone(b.n_prenom) = public.dmetaphone(norm_prenom)
               OR public.levenshtein(b.n_prenom, norm_prenom) <= tol_prenom + 1) THEN 12
        ELSE 99
      END AS score
    FROM base b
  )
  SELECT s.id, s.nom, s.prenom, s.email, s.telephone, s.adresse, s.code_postal, s.ville
  FROM scored s
  WHERE s.score < 99
  ORDER BY s.score ASC, s.n_nom, s.n_prenom
  LIMIT 8;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) TO anon, authenticated;
