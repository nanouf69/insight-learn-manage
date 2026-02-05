-- Créer la table contacts pour le CRM
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  fonction TEXT,
  entreprise TEXT,
  email TEXT,
  telephone TEXT,
  statut TEXT DEFAULT 'lead',
  valeur_estimee NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès public
CREATE POLICY "Allow public read contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Allow public insert contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete contacts" ON public.contacts FOR DELETE USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();