-- BUG #7 FIX: Corriger les policies RLS sur reponses_apprenants
-- L'ancienne policy comparait user_id (auth.uid()) avec apprenants.id (row UUID)
-- ce qui bloquait TOUTE écriture par les étudiants.
-- Fix: vérifier que auth.uid() est lié à un apprenant via auth_user_id

-- DROP les policies cassées de la migration 20260329113621
DROP POLICY IF EXISTS "Learner can insert own reponses" ON public.reponses_apprenants;
DROP POLICY IF EXISTS "Learner can insert reponses without active session" ON public.reponses_apprenants;
DROP POLICY IF EXISTS "Learner can update own in_progress reponses" ON public.reponses_apprenants;
DROP POLICY IF EXISTS "Learner can update reponses without active session" ON public.reponses_apprenants;

-- INSERT: l'utilisateur authentifié peut insérer ses propres réponses
CREATE POLICY "Learner can insert own reponses"
ON public.reponses_apprenants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.auth_user_id = auth.uid() AND apprenants.id = reponses_apprenants.apprenant_id)
);

-- UPDATE: l'utilisateur authentifié peut modifier ses réponses non complétées
CREATE POLICY "Learner can update own in_progress reponses"
ON public.reponses_apprenants FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.auth_user_id = auth.uid() AND apprenants.id = reponses_apprenants.apprenant_id)
  AND COALESCE(completed, false) = false
)
WITH CHECK (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.auth_user_id = auth.uid() AND apprenants.id = reponses_apprenants.apprenant_id)
);

-- SELECT: l'utilisateur peut lire ses propres réponses
DROP POLICY IF EXISTS "Learner can read own reponses" ON public.reponses_apprenants;
CREATE POLICY "Learner can read own reponses"
ON public.reponses_apprenants FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.auth_user_id = auth.uid() AND apprenants.id = reponses_apprenants.apprenant_id)
  OR has_role(auth.uid(), 'admin')
);
