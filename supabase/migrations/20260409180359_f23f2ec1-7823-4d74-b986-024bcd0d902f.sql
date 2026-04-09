CREATE TABLE public.planning_pratique_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_date text NOT NULL,
  date_pratique text NOT NULL,
  planning_start_date date NOT NULL,
  planning_end_date date NOT NULL,
  excluded_days text[] NOT NULL DEFAULT '{}',
  extra_days text[] NOT NULL DEFAULT '{}',
  extra_candidats text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(exam_date, date_pratique)
);

ALTER TABLE public.planning_pratique_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage planning_pratique_config"
  ON public.planning_pratique_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
