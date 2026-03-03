CREATE POLICY "Authenticated users can update their own completions"
ON public.apprenant_module_completion FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM apprenants a 
  WHERE a.id = apprenant_module_completion.apprenant_id 
  AND a.auth_user_id = auth.uid()
));