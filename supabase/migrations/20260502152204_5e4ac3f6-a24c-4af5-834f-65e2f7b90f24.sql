-- Add module 83 (VTC émargement) to VTC and VA presential learners missing it
UPDATE public.apprenants
SET modules_autorises = array_append(modules_autorises, 83)
WHERE type_apprenant IN ('vtc', 'va')
  AND modules_autorises IS NOT NULL
  AND NOT (83 = ANY(modules_autorises));

-- Add module 84 (TAXI émargement) to TAXI and TA presential learners missing it
UPDATE public.apprenants
SET modules_autorises = array_append(modules_autorises, 84)
WHERE type_apprenant IN ('taxi', 'ta')
  AND modules_autorises IS NOT NULL
  AND NOT (84 = ANY(modules_autorises));