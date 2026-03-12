-- Fix: DROP the broken UPDATE policy and recreate with WITH CHECK
DROP POLICY IF EXISTS "Authenticated users can update their own completions" ON public.apprenant_module_completion;

CREATE POLICY "Authenticated users can update their own completions"
ON public.apprenant_module_completion
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM apprenants a
    WHERE a.id = apprenant_module_completion.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM apprenants a
    WHERE a.id = apprenant_module_completion.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);