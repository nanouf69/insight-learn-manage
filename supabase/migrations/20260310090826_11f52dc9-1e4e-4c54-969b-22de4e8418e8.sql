-- SECURITY FIX: Remove dangerously permissive public policies on apprenants table
DROP POLICY IF EXISTS "Allow public read for onboarding" ON public.apprenants;
DROP POLICY IF EXISTS "Allow public update for onboarding" ON public.apprenants;
DROP POLICY IF EXISTS "Allow public insert for onboarding" ON public.apprenants;

-- SECURITY FIX: Remove dangerously permissive public policies on documents_inscription
DROP POLICY IF EXISTS "Allow public select documents_inscription" ON public.documents_inscription;
DROP POLICY IF EXISTS "Allow public update documents_inscription" ON public.documents_inscription;
DROP POLICY IF EXISTS "Allow public insert documents_inscription" ON public.documents_inscription;

-- Re-create onboarding policies scoped to the user's own record only
-- For onboarding: allow unauthenticated INSERT (new registration) but restrict read/update to own record
CREATE POLICY "Onboarding insert apprenants" ON public.apprenants
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Students can update own apprenant" ON public.apprenants
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- For documents_inscription: only allow insert/read/update on own documents
CREATE POLICY "Students can insert own documents_inscription" ON public.documents_inscription
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM apprenants a 
    WHERE a.id = documents_inscription.apprenant_id 
    AND a.auth_user_id = auth.uid()
  ));

CREATE POLICY "Students can select own documents_inscription" ON public.documents_inscription
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM apprenants a 
    WHERE a.id = documents_inscription.apprenant_id 
    AND a.auth_user_id = auth.uid()
  ));

CREATE POLICY "Students can update own documents_inscription" ON public.documents_inscription
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM apprenants a 
    WHERE a.id = documents_inscription.apprenant_id 
    AND a.auth_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM apprenants a 
    WHERE a.id = documents_inscription.apprenant_id 
    AND a.auth_user_id = auth.uid()
  ));