GRANT SELECT ON public.notes_frais TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notes_frais TO authenticated;
GRANT ALL ON public.notes_frais TO service_role;