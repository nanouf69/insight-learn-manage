
CREATE POLICY "Onboarding update apprenants"
ON public.apprenants
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
