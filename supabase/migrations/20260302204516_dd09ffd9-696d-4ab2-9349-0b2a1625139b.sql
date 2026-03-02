
-- Table to track module completion per apprenant
CREATE TABLE public.apprenant_module_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, module_id)
);

ALTER TABLE public.apprenant_module_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read their own completions"
  ON public.apprenant_module_completion FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.apprenants a WHERE a.id = apprenant_id AND a.auth_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can insert their own completions"
  ON public.apprenant_module_completion FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.apprenants a WHERE a.id = apprenant_id AND a.auth_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can delete their own completions"
  ON public.apprenant_module_completion FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.apprenants a WHERE a.id = apprenant_id AND a.auth_user_id = auth.uid()
  ));

-- Admins can manage all
CREATE POLICY "Admins can manage all completions"
  ON public.apprenant_module_completion FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
