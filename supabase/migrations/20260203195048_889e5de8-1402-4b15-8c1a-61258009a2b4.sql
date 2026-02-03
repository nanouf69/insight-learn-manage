-- Table des organismes de formation (pour le BPF)
CREATE TABLE public.organismes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  siret TEXT,
  code_naf TEXT,
  numero_declaration TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des formations
CREATE TABLE public.formations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  code_rncp TEXT,
  code_rs TEXT,
  code_nsf TEXT,
  duree_heures INTEGER NOT NULL DEFAULT 0,
  prix_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
  tva_taux DECIMAL(5,2) NOT NULL DEFAULT 20,
  description TEXT,
  objectifs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des apprenants
CREATE TABLE public.apprenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  date_naissance DATE,
  numero_dossier_cma TEXT,
  statut TEXT DEFAULT 'particulier', -- particulier, salarie, demandeur_emploi
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des formateurs
CREATE TABLE public.formateurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  type TEXT DEFAULT 'interne', -- interne, externe
  specialites TEXT,
  tarif_horaire DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_id UUID REFERENCES public.formations(id),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  lieu TEXT,
  places_disponibles INTEGER DEFAULT 10,
  statut TEXT DEFAULT 'planifiee', -- planifiee, en_cours, terminee, annulee
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table de liaison sessions-apprenants
CREATE TABLE public.session_apprenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, apprenant_id)
);

-- Table de liaison sessions-formateurs
CREATE TABLE public.session_formateurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  formateur_id UUID NOT NULL REFERENCES public.formateurs(id) ON DELETE CASCADE,
  heures_effectuees DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, formateur_id)
);

-- Table des factures avec type de financement pour le BPF
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  session_id UUID REFERENCES public.sessions(id),
  apprenant_id UUID REFERENCES public.apprenants(id),
  -- Type de financement pour le calcul BPF
  type_financement TEXT NOT NULL DEFAULT 'particulier', -- cpf, opco, entreprise, particulier, france_travail
  -- Client
  client_nom TEXT NOT NULL,
  client_adresse TEXT,
  client_siret TEXT,
  client_opco TEXT,
  -- Montants
  montant_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
  tva_taux DECIMAL(5,2) NOT NULL DEFAULT 20,
  montant_tva DECIMAL(10,2) NOT NULL DEFAULT 0,
  montant_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Statut
  statut TEXT DEFAULT 'en_attente', -- en_attente, payee, annulee
  date_paiement DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables (public access for now, can add auth later)
ALTER TABLE public.organismes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_apprenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_formateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (can be restricted to authenticated users later)
CREATE POLICY "Allow public read organismes" ON public.organismes FOR SELECT USING (true);
CREATE POLICY "Allow public insert organismes" ON public.organismes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update organismes" ON public.organismes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete organismes" ON public.organismes FOR DELETE USING (true);

CREATE POLICY "Allow public read formations" ON public.formations FOR SELECT USING (true);
CREATE POLICY "Allow public insert formations" ON public.formations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update formations" ON public.formations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete formations" ON public.formations FOR DELETE USING (true);

CREATE POLICY "Allow public read apprenants" ON public.apprenants FOR SELECT USING (true);
CREATE POLICY "Allow public insert apprenants" ON public.apprenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update apprenants" ON public.apprenants FOR UPDATE USING (true);
CREATE POLICY "Allow public delete apprenants" ON public.apprenants FOR DELETE USING (true);

CREATE POLICY "Allow public read formateurs" ON public.formateurs FOR SELECT USING (true);
CREATE POLICY "Allow public insert formateurs" ON public.formateurs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update formateurs" ON public.formateurs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete formateurs" ON public.formateurs FOR DELETE USING (true);

CREATE POLICY "Allow public read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update sessions" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete sessions" ON public.sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read session_apprenants" ON public.session_apprenants FOR SELECT USING (true);
CREATE POLICY "Allow public insert session_apprenants" ON public.session_apprenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete session_apprenants" ON public.session_apprenants FOR DELETE USING (true);

CREATE POLICY "Allow public read session_formateurs" ON public.session_formateurs FOR SELECT USING (true);
CREATE POLICY "Allow public insert session_formateurs" ON public.session_formateurs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update session_formateurs" ON public.session_formateurs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete session_formateurs" ON public.session_formateurs FOR DELETE USING (true);

CREATE POLICY "Allow public read factures" ON public.factures FOR SELECT USING (true);
CREATE POLICY "Allow public insert factures" ON public.factures FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update factures" ON public.factures FOR UPDATE USING (true);
CREATE POLICY "Allow public delete factures" ON public.factures FOR DELETE USING (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organismes_updated_at BEFORE UPDATE ON public.organismes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_formations_updated_at BEFORE UPDATE ON public.formations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apprenants_updated_at BEFORE UPDATE ON public.apprenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_formateurs_updated_at BEFORE UPDATE ON public.formateurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();