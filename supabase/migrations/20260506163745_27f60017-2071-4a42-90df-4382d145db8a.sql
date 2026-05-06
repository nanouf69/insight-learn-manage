CREATE TABLE public.apprenant_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  apprenant_nom TEXT,
  question TEXT NOT NULL,
  reponse TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  read_by_apprenant BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_apprenant_questions_apprenant ON public.apprenant_questions(apprenant_id);
CREATE INDEX idx_apprenant_questions_status ON public.apprenant_questions(status);

ALTER TABLE public.apprenant_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apprenants view own questions"
ON public.apprenant_questions FOR SELECT
USING (apprenant_id IN (SELECT id FROM public.apprenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Apprenants insert own questions"
ON public.apprenant_questions FOR INSERT
WITH CHECK (apprenant_id IN (SELECT id FROM public.apprenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Apprenants update own questions"
ON public.apprenant_questions FOR UPDATE
USING (apprenant_id IN (SELECT id FROM public.apprenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Staff full access questions"
ON public.apprenant_questions FOR ALL
USING (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.apprenants WHERE auth_user_id = auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.apprenants WHERE auth_user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.apprenant_questions;
ALTER TABLE public.apprenant_questions REPLICA IDENTITY FULL;