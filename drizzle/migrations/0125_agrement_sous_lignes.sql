ALTER TABLE public.agrement_pieces_fichiers ADD COLUMN IF NOT EXISTS sous_ligne text, ADD COLUMN IF NOT EXISTS bloc_id uuid;

CREATE TABLE public.agrement_blocs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  societe text NOT NULL CHECK (societe IN ('services_pro','opto')),
  type text NOT NULL CHECK (type IN ('vehicule','formateur')),
  nom text NOT NULL DEFAULT '',
  ordre int NOT NULL DEFAULT 0,
  masque boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agrement_blocs TO authenticated;
GRANT ALL ON public.agrement_blocs TO service_role;
ALTER TABLE public.agrement_blocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin select blocs" ON public.agrement_blocs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert blocs" ON public.agrement_blocs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update blocs" ON public.agrement_blocs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agrement_sous_lignes_etat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  societe text NOT NULL,
  dossier text NOT NULL,
  sous_ligne text NOT NULL,
  bloc_id uuid,
  non_concerne boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agrement_sle_uniq ON public.agrement_sous_lignes_etat (societe, dossier, sous_ligne, coalesce(bloc_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE ON public.agrement_sous_lignes_etat TO authenticated;
GRANT ALL ON public.agrement_sous_lignes_etat TO service_role;
ALTER TABLE public.agrement_sous_lignes_etat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin select sle" ON public.agrement_sous_lignes_etat FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert sle" ON public.agrement_sous_lignes_etat FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update sle" ON public.agrement_sous_lignes_etat FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admin agrement_pieces_extra" ON public.agrement_pieces_extra;
CREATE POLICY "admin agrement_pieces_extra" ON public.agrement_pieces_extra FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));