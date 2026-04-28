-- Table pour stocker les informations financeur saisies par les apprenants en formation continue
CREATE TABLE IF NOT EXISTS public.financeurs_fc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type_financeur TEXT NOT NULL DEFAULT 'particulier',
  raison_sociale TEXT,
  siren TEXT,
  siret TEXT,
  numero_tva TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  contact_nom TEXT,
  contact_email TEXT,
  contact_telephone TEXT,
  organisme_financeur TEXT,
  numero_dossier TEXT,
  email_facturation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id)
);

ALTER TABLE public.financeurs_fc ENABLE ROW LEVEL SECURITY;

-- Admins gèrent tout
CREATE POLICY "Admins can manage financeurs_fc"
ON public.financeurs_fc
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Apprenant peut insérer/voir/modifier ses propres infos financeur
CREATE POLICY "Learner can insert own financeurs_fc"
ON public.financeurs_fc
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = financeurs_fc.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Learner can select own financeurs_fc"
ON public.financeurs_fc
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = financeurs_fc.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Learner can update own financeurs_fc"
ON public.financeurs_fc
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = financeurs_fc.apprenant_id AND a.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = financeurs_fc.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE TRIGGER update_financeurs_fc_updated_at
BEFORE UPDATE ON public.financeurs_fc
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();