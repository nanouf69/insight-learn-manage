DELETE FROM public.emargements_fc e
USING public.apprenants a
WHERE e.apprenant_id = a.id
  AND e.demi_journee IN ('soir','soir_1','soir_2')
  AND LOWER(COALESCE(a.creneau_horaire,'')) = 'journee';