
CREATE TABLE public.app_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL DEFAULT to_char(now(), 'YYYYMMDDHH24MISS'),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_version"
  ON public.app_version
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage app_version"
  ON public.app_version
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_version (version) VALUES (to_char(now(), 'YYYYMMDDHH24MISS'));
