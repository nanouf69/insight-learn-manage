-- Table pour stocker les blocs de cours de l'agenda
CREATE TABLE public.agenda_blocs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formateur_id UUID REFERENCES public.formateurs(id) ON DELETE CASCADE,
  discipline_id TEXT NOT NULL,
  discipline_nom TEXT NOT NULL,
  discipline_color TEXT NOT NULL,
  formation TEXT NOT NULL,
  jour INTEGER NOT NULL, -- 0 = Lundi, 1 = Mardi, etc.
  heure_debut TEXT NOT NULL, -- Format "08:00"
  heure_fin TEXT NOT NULL, -- Format "10:00"
  semaine_debut DATE NOT NULL, -- Date du lundi de la semaine
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agenda_blocs ENABLE ROW LEVEL SECURITY;

-- Policies pour accès public (pas d'auth dans ce projet)
CREATE POLICY "Allow public read agenda_blocs" ON public.agenda_blocs FOR SELECT USING (true);
CREATE POLICY "Allow public insert agenda_blocs" ON public.agenda_blocs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update agenda_blocs" ON public.agenda_blocs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete agenda_blocs" ON public.agenda_blocs FOR DELETE USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_agenda_blocs_updated_at
  BEFORE UPDATE ON public.agenda_blocs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for auto-sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_blocs;