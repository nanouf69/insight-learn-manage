
-- Allow public insert for apprenants (needed for formation continue public form)
CREATE POLICY "Allow public insert for onboarding"
ON public.apprenants
FOR INSERT
WITH CHECK (true);

-- Allow public select on sessions (needed to find existing sessions)
CREATE POLICY "Allow public select sessions for onboarding"
ON public.sessions
FOR SELECT
USING (true);

-- Allow public insert on sessions (needed to create new sessions)
CREATE POLICY "Allow public insert sessions for onboarding"
ON public.sessions
FOR INSERT
WITH CHECK (true);

-- Allow public insert on session_apprenants (needed to link apprenant to session)
CREATE POLICY "Allow public insert session_apprenants for onboarding"
ON public.session_apprenants
FOR INSERT
WITH CHECK (true);
