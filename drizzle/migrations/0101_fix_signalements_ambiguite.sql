CREATE OR REPLACE FUNCTION public.admin_signalements_validation_modules()
RETURNS TABLE (apprenant_id uuid, nom text, prenom text, module_id integer, completed_at timestamptz, type_signalement text, est_compte_test boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'réservé aux administrateurs';
  END IF;
  RETURN QUERY
  WITH q AS (
    SELECT m.module_id AS mid FROM public.module_editor_state m,
      jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices')='array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e
    WHERE jsonb_typeof(e->'questions')='array' AND jsonb_array_length(e->'questions')>0
    UNION SELECT r.module_id FROM public.module_regles_validation r WHERE r.contient_questions IS TRUE
  ), c AS (
    SELECT amc.apprenant_id AS aid, amc.module_id AS mid, amc.completed_at AS cat,
      EXISTS (SELECT 1 FROM public.reponses_apprenants ra WHERE ra.apprenant_id=amc.apprenant_id
              AND ra.exercice_id LIKE 'module\_'||amc.module_id||'\_%') AS a_fiche,
      EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(amc.details)='array' THEN amc.details ELSE '[]'::jsonb END) d
              WHERE d->'reponseEleve' IS NOT NULL AND (d->'reponseEleve')::text NOT IN ('null','""','[]','{}')) AS a_prog
    FROM public.apprenant_module_completion amc
    WHERE amc.status='completed' AND amc.module_id IN (SELECT q.mid FROM q)
  )
  SELECT c.aid, a.nom::text, a.prenom::text, c.mid, c.cat,
    CASE WHEN NOT c.a_prog THEN 'validation_sans_reponse' ELSE 'reponses_dans_progression_seulement' END,
    (EXISTS (SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=c.aid)
      OR a.nom ILIKE 'TEST%' OR a.nom ILIKE 'DEMO%' OR a.nom ILIKE 'DEBUG%')
  FROM c JOIN public.apprenants a ON a.id=c.aid
  WHERE NOT c.a_fiche
  ORDER BY 6, 5 DESC;
END $$;