CREATE TABLE IF NOT EXISTS public.reponses_apprenants_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  user_id uuid,
  module_id integer,
  exercice_id text NOT NULL,
  exercice_type text NOT NULL DEFAULT 'quiz',
  question_id text NOT NULL,
  valeur jsonb NOT NULL DEFAULT '[]'::jsonb,
  tentative integer NOT NULL DEFAULT 1,
  client_saved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reponses_apprenants_journal TO authenticated;
GRANT ALL ON public.reponses_apprenants_journal TO service_role;

ALTER TABLE public.reponses_apprenants_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learner can insert own journal"
ON public.reponses_apprenants_journal
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.apprenants a
  WHERE a.id = reponses_apprenants_journal.apprenant_id
    AND a.auth_user_id = auth.uid()
));

CREATE POLICY "Learner or admin can read journal"
ON public.reponses_apprenants_journal
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = reponses_apprenants_journal.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_raj_apprenant_exercice
  ON public.reponses_apprenants_journal (apprenant_id, exercice_id, tentative, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raj_question
  ON public.reponses_apprenants_journal (apprenant_id, exercice_id, question_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.protect_reponses_apprenants_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Le journal des reponses apprenants est en ecriture seule (append-only)';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_reponses_apprenants_journal ON public.reponses_apprenants_journal;
CREATE TRIGGER trg_protect_reponses_apprenants_journal
BEFORE UPDATE OR DELETE ON public.reponses_apprenants_journal
FOR EACH ROW EXECUTE FUNCTION public.protect_reponses_apprenants_journal();