
CREATE TABLE public.apprenant_documents_completes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type_document text NOT NULL,
  titre text NOT NULL,
  donnees jsonb NOT NULL DEFAULT '{}'::jsonb,
  module_id integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apprenant_documents_completes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage apprenant_documents_completes"
  ON public.apprenant_documents_completes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Students can insert their own
CREATE POLICY "Students can insert own documents_completes"
  ON public.apprenant_documents_completes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = apprenant_documents_completes.apprenant_id AND a.auth_user_id = auth.uid())
  );

-- Students can read their own
CREATE POLICY "Students can select own documents_completes"
  ON public.apprenant_documents_completes
  FOR SELECT
  USING (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = apprenant_documents_completes.apprenant_id AND a.auth_user_id = auth.uid())
  );
