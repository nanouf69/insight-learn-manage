-- Table pour stocker les métadonnées des documents (les fichiers seront dans le storage)
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  taille INTEGER,
  formation_id UUID REFERENCES public.formations(id),
  session_id UUID REFERENCES public.sessions(id),
  apprenant_id UUID REFERENCES public.apprenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les BPF
CREATE TABLE public.bpf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annee INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut TEXT DEFAULT 'brouillon',
  -- Données organisme
  organisme_siret TEXT,
  organisme_code_naf TEXT,
  organisme_numero_declaration TEXT,
  organisme_forme_juridique TEXT,
  organisme_denomination TEXT,
  organisme_adresse TEXT,
  organisme_telephone TEXT,
  organisme_email TEXT,
  -- Données financières (produits)
  produits_entreprises NUMERIC DEFAULT 0,
  produits_cpf NUMERIC DEFAULT 0,
  produits_particuliers NUMERIC DEFAULT 0,
  produits_opco NUMERIC DEFAULT 0,
  produits_france_travail NUMERIC DEFAULT 0,
  produits_total NUMERIC DEFAULT 0,
  -- Charges
  charges_total NUMERIC DEFAULT 0,
  charges_salaires_formateurs NUMERIC DEFAULT 0,
  charges_prestations NUMERIC DEFAULT 0,
  -- Formateurs
  formateurs_internes_nombre INTEGER DEFAULT 0,
  formateurs_internes_heures INTEGER DEFAULT 0,
  formateurs_externes_nombre INTEGER DEFAULT 0,
  formateurs_externes_heures INTEGER DEFAULT 0,
  -- Stagiaires
  stagiaires_salaries_nombre INTEGER DEFAULT 0,
  stagiaires_salaries_heures INTEGER DEFAULT 0,
  stagiaires_particuliers_nombre INTEGER DEFAULT 0,
  stagiaires_particuliers_heures INTEGER DEFAULT 0,
  stagiaires_demandeurs_emploi_nombre INTEGER DEFAULT 0,
  stagiaires_demandeurs_emploi_heures INTEGER DEFAULT 0,
  stagiaires_total_nombre INTEGER DEFAULT 0,
  stagiaires_total_heures INTEGER DEFAULT 0,
  -- Signature
  dirigeant_nom TEXT,
  dirigeant_qualite TEXT,
  signature_lieu TEXT,
  signature_date DATE,
  -- JSON pour les spécialités et objectifs
  specialites JSONB DEFAULT '[]',
  objectifs JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS sur les nouvelles tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpf ENABLE ROW LEVEL SECURITY;

-- Policies pour documents
CREATE POLICY "Allow public read documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete documents" ON public.documents FOR DELETE USING (true);

-- Policies pour bpf
CREATE POLICY "Allow public read bpf" ON public.bpf FOR SELECT USING (true);
CREATE POLICY "Allow public insert bpf" ON public.bpf FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bpf" ON public.bpf FOR UPDATE USING (true);
CREATE POLICY "Allow public delete bpf" ON public.bpf FOR DELETE USING (true);

-- Ajouter une colonne organisme_financeur à la table apprenants
ALTER TABLE public.apprenants ADD COLUMN IF NOT EXISTS organisme_financeur TEXT;