
-- Ajouter le module Fiches Révisions aux apprenants existants qui ne l'ont pas encore
-- VTC (type_apprenant = 'VTC' ou 'VTC-S' ou 'VTC-A') → module 70
UPDATE apprenants
SET modules_autorises = array_append(modules_autorises, 70)
WHERE modules_autorises IS NOT NULL
  AND NOT (70 = ANY(modules_autorises))
  AND (
    type_apprenant IN ('VTC', 'VTC-S', 'VTC-A')
    OR (type_apprenant IS NULL AND formation_choisie ILIKE '%vtc%' AND formation_choisie NOT ILIKE '%taxi%')
    OR (1 = ANY(modules_autorises) AND 2 = ANY(modules_autorises) AND NOT (10 = ANY(modules_autorises)))
  );

-- TAXI (type_apprenant = 'TAXI' ou 'TAXI-S') → module 71
UPDATE apprenants
SET modules_autorises = array_append(modules_autorises, 71)
WHERE modules_autorises IS NOT NULL
  AND NOT (71 = ANY(modules_autorises))
  AND (
    type_apprenant IN ('TAXI', 'TAXI-S')
    OR (type_apprenant IS NULL AND formation_choisie ILIKE '%taxi%' AND formation_choisie NOT ILIKE '%vtc%')
    OR (10 = ANY(modules_autorises) AND 13 = ANY(modules_autorises) AND NOT (2 = ANY(modules_autorises)))
  );

-- TA (Passerelle Taxi pour VTC) → module 72
UPDATE apprenants
SET modules_autorises = array_append(modules_autorises, 72)
WHERE modules_autorises IS NOT NULL
  AND NOT (72 = ANY(modules_autorises))
  AND (
    type_apprenant = 'TA'
    OR (31 = ANY(modules_autorises) AND 40 = ANY(modules_autorises))
  );

-- VA (Passerelle VTC pour Taxi) → module 73
UPDATE apprenants
SET modules_autorises = array_append(modules_autorises, 73)
WHERE modules_autorises IS NOT NULL
  AND NOT (73 = ANY(modules_autorises))
  AND (
    type_apprenant = 'VA'
    OR (33 = ANY(modules_autorises) AND 41 = ANY(modules_autorises))
  );
