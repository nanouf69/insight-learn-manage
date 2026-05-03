CREATE POLICY "Learners can view their own session links"
ON public.session_apprenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.apprenants a
    WHERE a.id = session_apprenants.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);