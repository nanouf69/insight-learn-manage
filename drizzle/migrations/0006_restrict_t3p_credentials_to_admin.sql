DROP POLICY IF EXISTS "CRM users manage T3P credentials" ON public.apprenant_identifiants_t3p;
CREATE POLICY "Admins manage T3P credentials"
ON public.apprenant_identifiants_t3p
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));