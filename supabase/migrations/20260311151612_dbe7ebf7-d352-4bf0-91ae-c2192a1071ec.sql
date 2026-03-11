
CREATE TABLE public.module_editor_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer NOT NULL UNIQUE,
  module_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_cours jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_exercices jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_fingerprint text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.module_editor_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage module_editor_state"
  ON public.module_editor_state FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read module_editor_state"
  ON public.module_editor_state FOR SELECT
  TO public
  USING (true);
