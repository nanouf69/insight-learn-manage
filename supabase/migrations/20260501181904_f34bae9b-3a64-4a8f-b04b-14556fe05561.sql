CREATE TABLE IF NOT EXISTS public.formateur_emargements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  formateur_id UUID,
  date_jour DATE NOT NULL,
  signature_data_url TEXT NOT NULL,
  blocs_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fournisseur_id, date_jour)
);

ALTER TABLE public.formateur_emargements ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout voir
CREATE POLICY "Admins can manage formateur emargements"
ON public.formateur_emargements
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Tout le monde peut lire/insérer (le portail fournisseur n'utilise pas auth, l'accès est protégé par le slug du fournisseur côté client)
CREATE POLICY "Public can read formateur emargements"
ON public.formateur_emargements
FOR SELECT
USING (true);

CREATE POLICY "Public can insert formateur emargements"
ON public.formateur_emargements
FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_formateur_emargements_fournisseur_date
ON public.formateur_emargements(fournisseur_id, date_jour DESC);