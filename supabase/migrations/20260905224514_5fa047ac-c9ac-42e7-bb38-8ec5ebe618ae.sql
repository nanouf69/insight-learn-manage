CREATE TABLE public.taches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  priorite TEXT NOT NULL DEFAULT 'normale' CHECK (priorite IN ('urgente','haute','normale','basse')),
  echeance DATE,
  terminee BOOLEAN NOT NULL DEFAULT false,
  terminee_at TIMESTAMP WITH TIME ZONE,
  terminee_par TEXT,
  cree_par TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taches TO authenticated;
GRANT ALL ON public.taches TO service_role;
ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe peut voir les taches" ON public.taches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe peut creer des taches" ON public.taches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Equipe peut modifier les taches" ON public.taches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Equipe peut supprimer les taches" ON public.taches FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_taches_updated_at BEFORE UPDATE ON public.taches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.taches;