CREATE TABLE public.module_acces_derogations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 apprenant_id uuid NOT NULL REFERENCES public.apprenants(id),
 module_id integer NOT NULL,
 motif text NOT NULL CHECK (length(trim(motif)) >= 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (apprenant_id,module_id)
);
GRANT SELECT, INSERT ON public.module_acces_derogations TO authenticated;
GRANT ALL ON public.module_acces_derogations TO service_role;
ALTER TABLE public.module_acces_derogations ENABLE ROW LEVEL SECURITY;
CREATE POLICY module_acces_read ON public.module_acces_derogations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id=apprenant_id AND a.auth_user_id=auth.uid()));
CREATE POLICY module_acces_admin_insert ON public.module_acces_derogations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.module_acces_derogations IS 'Administrative prerequisite-access exceptions only; never module completion or exam authorization, intersected with current assigned modules.';