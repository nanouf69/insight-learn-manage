
-- #7: Restreindre la policy "Onboarding update apprenants" 
-- Actuellement: USING(true) WITH CHECK(true) sur public = n'importe qui peut modifier n'importe quel apprenant
-- Correction: limiter aux apprenants sans auth_user_id (pas encore associés) ET uniquement les champs onboarding

DROP POLICY IF EXISTS "Onboarding update apprenants" ON public.apprenants;

CREATE POLICY "Onboarding update apprenants"
  ON public.apprenants
  FOR UPDATE
  TO public
  USING (auth_user_id IS NULL AND deleted_at IS NULL)
  WITH CHECK (auth_user_id IS NULL AND deleted_at IS NULL);

-- #8: Supprimer les policies publiques dangereuses sur quiz_questions_overrides
-- Actuellement: INSERT/UPDATE/DELETE/SELECT ouverts à public avec true

DROP POLICY IF EXISTS "Public can delete quiz_overrides" ON public.quiz_questions_overrides;
DROP POLICY IF EXISTS "Public can insert quiz_overrides" ON public.quiz_questions_overrides;
DROP POLICY IF EXISTS "Public can update quiz_overrides" ON public.quiz_questions_overrides;
DROP POLICY IF EXISTS "Public can select quiz_overrides" ON public.quiz_questions_overrides;

-- Recréer: lecture seule pour les authentifiés (apprenants ont besoin de lire les overrides pour afficher les questions modifiées)
CREATE POLICY "Authenticated can read quiz_overrides"
  ON public.quiz_questions_overrides
  FOR SELECT
  TO authenticated
  USING (true);

-- Les admins gardent le CRUD complet via la policy existante "Admins can manage quiz_overrides"
