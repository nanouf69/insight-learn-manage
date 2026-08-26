CREATE POLICY "Apprenants can read own grilles notation"
ON public.grilles_notation_conduite
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = grilles_notation_conduite.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);