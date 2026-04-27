-- Table d'émargement pour la formation continue
CREATE TABLE IF NOT EXISTS public.emargements_fc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  date_emargement DATE NOT NULL DEFAULT CURRENT_DATE,
  demi_journee TEXT NOT NULL CHECK (demi_journee IN ('matin', 'apres_midi')),
  signature_data_url TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT emargements_fc_unique_per_half_day UNIQUE (apprenant_id, date_emargement, demi_journee)
);

CREATE INDEX IF NOT EXISTS idx_emargements_fc_apprenant_date
  ON public.emargements_fc (apprenant_id, date_emargement DESC);

ALTER TABLE public.emargements_fc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage emargements_fc"
ON public.emargements_fc
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Learner can select own emargements_fc"
ON public.emargements_fc
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = emargements_fc.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Learner can insert own emargements_fc"
ON public.emargements_fc
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = emargements_fc.apprenant_id AND a.auth_user_id = auth.uid()
  )
);