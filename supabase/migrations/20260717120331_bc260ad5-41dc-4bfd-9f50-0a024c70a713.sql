
-- Fix RLS so learners see ALL their own connexions/activities (even legacy rows
-- with a null/mismatched user_id), matching what admins see.
DROP POLICY IF EXISTS "Students can select own apprenant_connexions" ON public.apprenant_connexions;
CREATE POLICY "Students can select own apprenant_connexions"
ON public.apprenant_connexions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_connexions.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Students can select own apprenant_module_activites" ON public.apprenant_module_activites;
CREATE POLICY "Students can select own apprenant_module_activites"
ON public.apprenant_module_activites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_module_activites.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);
