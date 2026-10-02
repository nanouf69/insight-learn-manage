CREATE TABLE public.agrement_pieces_extra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  societe text NOT NULL,
  dossier text NOT NULL,
  label text NOT NULL,
  ordre integer NOT NULL DEFAULT 100,
  masque boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrement_pieces_extra TO authenticated;
GRANT ALL ON public.agrement_pieces_extra TO service_role;
ALTER TABLE public.agrement_pieces_extra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin agrement_pieces_extra" ON public.agrement_pieces_extra FOR ALL TO authenticated USING (true) WITH CHECK (true);