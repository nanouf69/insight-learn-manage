
CREATE TABLE public.quiz_questions_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id uuid NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  quiz_id text NOT NULL,
  section_id integer NOT NULL,
  question_id integer NOT NULL,
  enonce text NOT NULL,
  choix jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fournisseur_id, quiz_id, section_id, question_id)
);

ALTER TABLE public.quiz_questions_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can select quiz_overrides" ON public.quiz_questions_overrides FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert quiz_overrides" ON public.quiz_questions_overrides FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update quiz_overrides" ON public.quiz_questions_overrides FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete quiz_overrides" ON public.quiz_questions_overrides FOR DELETE TO public USING (true);
CREATE POLICY "Admins can manage quiz_overrides" ON public.quiz_questions_overrides FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
