CREATE TABLE public.releve_jalons_resolution (
  gel_id uuid PRIMARY KEY REFERENCES public.releve_jalons_fin_acces(id),
  volumes jsonb NOT NULL,
  limites jsonb NOT NULL DEFAULT '[]'::jsonb,
  methode_code text NOT NULL,
  cree_par uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.releve_jalons_resolution TO authenticated;
GRANT ALL ON public.releve_jalons_resolution TO service_role;
ALTER TABLE public.releve_jalons_resolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les résolutions" ON public.releve_jalons_resolution FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins figent une résolution" ON public.releve_jalons_resolution FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.releve_jalons_resolution IS 'Volumes résolus (contenu figé + programme du code) enregistrés une seule fois par gel ; jamais modifiés (pas de policy UPDATE/DELETE).';