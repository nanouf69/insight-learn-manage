
-- Replace auth.uid() check with EXISTS on apprenants for INSERT policies

DROP POLICY IF EXISTS "Learner can insert own reponses" ON public.reponses_apprenants;
CREATE POLICY "Learner can insert own reponses"
ON public.reponses_apprenants FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_apprenant(apprenant_id)
  AND EXISTS (SELECT 1 FROM apprenants WHERE apprenants.id = reponses_apprenants.user_id)
);

DROP POLICY IF EXISTS "Learner can insert reponses without active session" ON public.reponses_apprenants;
CREATE POLICY "Learner can insert reponses without active session"
ON public.reponses_apprenants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.id = reponses_apprenants.user_id)
  AND EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
);

-- Replace auth.uid() check with EXISTS on apprenants for UPDATE policies

DROP POLICY IF EXISTS "Learner can update own in_progress reponses" ON public.reponses_apprenants;
CREATE POLICY "Learner can update own in_progress reponses"
ON public.reponses_apprenants FOR UPDATE TO authenticated
USING (
  is_current_user_apprenant(apprenant_id)
  AND EXISTS (SELECT 1 FROM apprenants WHERE apprenants.id = reponses_apprenants.user_id)
  AND COALESCE(completed, false) = false
)
WITH CHECK (
  is_current_user_apprenant(apprenant_id)
  AND EXISTS (SELECT 1 FROM apprenants WHERE apprenants.id = reponses_apprenants.user_id)
);

DROP POLICY IF EXISTS "Learner can update reponses without active session" ON public.reponses_apprenants;
CREATE POLICY "Learner can update reponses without active session"
ON public.reponses_apprenants FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.id = reponses_apprenants.user_id)
  AND EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM apprenants WHERE apprenants.id = reponses_apprenants.user_id)
  AND EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
);
