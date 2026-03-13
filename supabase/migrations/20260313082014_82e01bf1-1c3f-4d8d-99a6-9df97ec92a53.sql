
-- Table pour sauvegarder les réponses en cours des apprenants
CREATE TABLE public.reponses_apprenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  exercice_id text NOT NULL,
  exercice_type text NOT NULL DEFAULT 'quiz',
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric DEFAULT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(apprenant_id, exercice_id)
);

ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage reponses_apprenants" ON public.reponses_apprenants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Students can insert own
CREATE POLICY "Students can insert own reponses" ON public.reponses_apprenants
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
  );

-- Students can select own
CREATE POLICY "Students can select own reponses" ON public.reponses_apprenants
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
  );

-- Students can update own
CREATE POLICY "Students can update own reponses" ON public.reponses_apprenants
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
  );

-- Students can delete own
CREATE POLICY "Students can delete own reponses" ON public.reponses_apprenants
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM apprenants a WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid())
  );
