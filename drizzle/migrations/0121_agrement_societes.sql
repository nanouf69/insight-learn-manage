ALTER TABLE public.agrement_pieces_fichiers ADD COLUMN IF NOT EXISTS societe text;
ALTER TABLE public.agrement_pieces_fichiers ADD CONSTRAINT agrement_pieces_societe_check
  CHECK ((societe IN ('services_pro','opto')) OR (societe IS NULL AND piece_code = 'p5'));
CREATE TABLE public.agrement_dossiers_societe (
  societe text NOT NULL CHECK (societe IN ('services_pro','opto')),
  type text NOT NULL CHECK (type IN ('taxi','vtc')),
  date_delivrance date,
  piece3_non_concerne boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (societe, type)
);
GRANT SELECT, INSERT, UPDATE ON public.agrement_dossiers_societe TO authenticated;
GRANT ALL ON public.agrement_dossiers_societe TO service_role;
ALTER TABLE public.agrement_dossiers_societe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin select" ON public.agrement_dossiers_societe FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert" ON public.agrement_dossiers_societe FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.agrement_dossiers_societe FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.agrement_dossiers IS 'DEPRECATED: replaced by agrement_dossiers_societe';