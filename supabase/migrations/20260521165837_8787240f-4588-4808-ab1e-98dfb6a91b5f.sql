DELETE FROM public.emargements_fc e
USING public.apprenants a
WHERE e.apprenant_id = a.id
  AND e.demi_journee IN ('soir','soir_1','soir_2')
  AND a.creneau_horaire IS NULL
  AND (
    (LOWER(public.unaccent(a.nom)) = 'dominique' AND LOWER(public.unaccent(a.prenom)) = 'dominique')
    OR (LOWER(public.unaccent(a.nom)) = 'ka' AND LOWER(public.unaccent(a.prenom)) = 'moussa')
    OR (LOWER(public.unaccent(a.nom)) = 'm''barki' AND LOWER(public.unaccent(a.prenom)) = 'mehdi')
    OR (LOWER(public.unaccent(a.nom)) = 'mbarki' AND LOWER(public.unaccent(a.prenom)) = 'mehdi')
  );

UPDATE public.apprenants
SET creneau_horaire = 'journee'
WHERE creneau_horaire IS NULL
  AND (
    (LOWER(public.unaccent(nom)) = 'dominique' AND LOWER(public.unaccent(prenom)) = 'dominique')
    OR (LOWER(public.unaccent(nom)) = 'ka' AND LOWER(public.unaccent(prenom)) = 'moussa')
    OR (LOWER(public.unaccent(nom)) IN ('m''barki','mbarki') AND LOWER(public.unaccent(prenom)) = 'mehdi')
  );