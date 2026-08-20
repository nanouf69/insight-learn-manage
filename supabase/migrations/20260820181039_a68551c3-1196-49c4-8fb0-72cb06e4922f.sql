CREATE TABLE public.renouvellements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL,
  libelle text NOT NULL,
  reference text,
  date_debut date,
  date_echeance date,
  notes text,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.renouvellements TO authenticated;
GRANT ALL ON public.renouvellements TO service_role;

ALTER TABLE public.renouvellements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can manage renouvellements"
ON public.renouvellements FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_renouvellements_updated_at
BEFORE UPDATE ON public.renouvellements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();