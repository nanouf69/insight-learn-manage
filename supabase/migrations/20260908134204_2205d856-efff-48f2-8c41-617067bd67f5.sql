CREATE TABLE public.apprenant_question_temps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  user_id uuid,
  module_id integer,
  module_nom text,
  exercice_id text,
  question_key text NOT NULL,
  question_num integer,
  seconds integer NOT NULL DEFAULT 0,
  answered boolean NOT NULL DEFAULT false,
  correct boolean,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aqt_apprenant ON public.apprenant_question_temps (apprenant_id, occurred_at DESC);
CREATE INDEX idx_aqt_module ON public.apprenant_question_temps (apprenant_id, module_id);

GRANT SELECT, INSERT ON public.apprenant_question_temps TO authenticated;
GRANT ALL ON public.apprenant_question_temps TO service_role;

ALTER TABLE public.apprenant_question_temps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage apprenant_question_temps"
ON public.apprenant_question_temps FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can insert own apprenant_question_temps"
ON public.apprenant_question_temps FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_question_temps.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Students can select own apprenant_question_temps"
ON public.apprenant_question_temps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_question_temps.apprenant_id AND a.auth_user_id = auth.uid()
  )
);