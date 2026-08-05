GRANT SELECT, INSERT, UPDATE, DELETE ON public.apprenant_connexions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apprenant_module_activites TO authenticated;
GRANT ALL ON public.apprenant_connexions TO service_role;
GRANT ALL ON public.apprenant_module_activites TO service_role;