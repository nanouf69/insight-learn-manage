UPDATE public.apprenants
SET modules_autorises = (
  SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(modules_autorises, ARRAY[]::int[]) || ARRAY[81, 87, 83, 85]))
)
WHERE LOWER(COALESCE(type_apprenant, '')) IN ('pa vtc', 'continue vtc', 'formation continue vtc')
   OR LOWER(COALESCE(formation_choisie, '')) LIKE '%continue%vtc%';