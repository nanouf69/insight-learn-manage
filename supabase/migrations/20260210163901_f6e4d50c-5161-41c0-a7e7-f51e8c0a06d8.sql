-- Allow anonymous/public SELECT on apprenants for onboarding search
-- This is needed because the onboarding page is public (no auth)
CREATE POLICY "Allow public read for onboarding"
ON public.apprenants
FOR SELECT
TO anon
USING (true);
