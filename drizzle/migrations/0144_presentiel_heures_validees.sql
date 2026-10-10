CREATE TABLE public.presentiel_heures_validees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  heures NUMERIC(6,2) NOT NULL CHECK (heures > 0 AND heures <= 500),
  motif TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.presentiel_heures_validees TO authenticated;
GRANT ALL ON public.presentiel_heures_validees TO service_role;

ALTER TABLE public.presentiel_heures_validees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read heures validees"
ON public.presentiel_heures_validees
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert heures validees"
ON public.presentiel_heures_validees
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.presentiel_heures_validees IS 'Heures de presence validees manuellement par un admin. Append-only : aucune modification ni suppression, chaque saisie est conservee.';