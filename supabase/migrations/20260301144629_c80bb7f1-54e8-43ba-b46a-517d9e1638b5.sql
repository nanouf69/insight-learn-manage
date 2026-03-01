-- Table to store quiz/exam results for students
CREATE TABLE public.apprenant_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'examen_blanc', -- 'examen_blanc', 'bilan', 'module_quiz'
  quiz_id TEXT NOT NULL, -- e.g. 'vtc_1', 'taxi_3', 'bilan_vtc'
  quiz_titre TEXT NOT NULL,
  matiere_id TEXT, -- e.g. 't3p', 'gestion'
  matiere_nom TEXT,
  score_obtenu NUMERIC NOT NULL DEFAULT 0,
  score_max NUMERIC NOT NULL DEFAULT 20,
  note_sur_20 NUMERIC, -- calculated note /20
  reussi BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}'::jsonb, -- detailed per-question results
  duree_secondes INTEGER, -- time taken
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apprenant_quiz_results ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage apprenant_quiz_results"
  ON public.apprenant_quiz_results FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Students can insert their own results
CREATE POLICY "Students can insert own quiz results"
  ON public.apprenant_quiz_results FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM apprenants a WHERE a.id = apprenant_quiz_results.apprenant_id AND a.auth_user_id = auth.uid())
  );

-- Students can view their own results
CREATE POLICY "Students can select own quiz results"
  ON public.apprenant_quiz_results FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM apprenants a WHERE a.id = apprenant_quiz_results.apprenant_id AND a.auth_user_id = auth.uid())
  );

-- Index for fast lookups
CREATE INDEX idx_quiz_results_apprenant ON public.apprenant_quiz_results(apprenant_id, completed_at DESC);
