REVOKE ALL ON public.qualiopi_adaptations FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.qualiopi_adaptations FROM authenticated;
GRANT SELECT, INSERT ON public.qualiopi_adaptations TO authenticated;
GRANT ALL ON public.qualiopi_adaptations TO service_role;