CREATE TABLE public.edof_fin_formation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  mis_fin_formation boolean NOT NULL,
  commentaire text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.edof_fin_formation TO authenticated;
GRANT ALL ON public.edof_fin_formation TO service_role;
ALTER TABLE public.edof_fin_formation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin lit edof" ON public.edof_fin_formation FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin ajoute edof" ON public.edof_fin_formation FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX ON public.edof_fin_formation(apprenant_id, created_at DESC);