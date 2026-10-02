CREATE TABLE public.agrement_dossiers (
  type text PRIMARY KEY CHECK (type IN ('taxi','vtc')),
  date_delivrance date,
  piece3_non_concerne boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agrement_dossiers TO authenticated;
GRANT ALL ON public.agrement_dossiers TO service_role;
ALTER TABLE public.agrement_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin select dossiers" ON public.agrement_dossiers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert dossiers" ON public.agrement_dossiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update dossiers" ON public.agrement_dossiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agrement_pieces_fichiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_code text NOT NULL,
  dossier text NOT NULL CHECK (dossier IN ('taxi','vtc','commun')),
  storage_path text NOT NULL,
  nom_fichier text NOT NULL,
  date_ajout timestamptz NOT NULL DEFAULT now(),
  date_expiration date,
  remplace_par uuid,
  masque boolean NOT NULL DEFAULT false,
  ajoute_par uuid DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE ON public.agrement_pieces_fichiers TO authenticated;
GRANT ALL ON public.agrement_pieces_fichiers TO service_role;
ALTER TABLE public.agrement_pieces_fichiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin select pieces" ON public.agrement_pieces_fichiers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert pieces" ON public.agrement_pieces_fichiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update pieces" ON public.agrement_pieces_fichiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin read agrements" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'agrements' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin upload agrements" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agrements' AND public.has_role(auth.uid(),'admin'));