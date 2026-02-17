
-- Table fournisseurs avec token unique pour lien d'accès
CREATE TABLE public.fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  email text,
  telephone text,
  adresse text,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fournisseurs" ON public.fournisseurs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can select fournisseur by token" ON public.fournisseurs FOR SELECT USING (true);

-- Table apprenants enregistrés par les fournisseurs
CREATE TABLE public.fournisseur_apprenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id uuid NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  civilite text,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  formation_choisie text,
  type_apprenant text,
  montant_ttc numeric,
  date_formation_catalogue text,
  creneau_horaire text,
  date_examen_theorique text,
  date_examen_pratique text,
  inscrit_france_travail boolean DEFAULT false,
  documents_complets boolean DEFAULT false,
  mode_financement text DEFAULT 'personnel',
  organisme_financeur text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseur_apprenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fournisseur_apprenants" ON public.fournisseur_apprenants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can insert fournisseur_apprenants" ON public.fournisseur_apprenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select fournisseur_apprenants" ON public.fournisseur_apprenants FOR SELECT USING (true);
CREATE POLICY "Public can update fournisseur_apprenants" ON public.fournisseur_apprenants FOR UPDATE USING (true);

-- Table documents pour chaque apprenant du fournisseur
CREATE TABLE public.fournisseur_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_apprenant_id uuid NOT NULL REFERENCES public.fournisseur_apprenants(id) ON DELETE CASCADE,
  fournisseur_id uuid NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  titre text NOT NULL,
  nom_fichier text NOT NULL,
  url text NOT NULL,
  type_document text NOT NULL DEFAULT 'autre',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseur_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fournisseur_documents" ON public.fournisseur_documents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can insert fournisseur_documents" ON public.fournisseur_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select fournisseur_documents" ON public.fournisseur_documents FOR SELECT USING (true);

-- Table factures fournisseurs
CREATE TABLE public.fournisseur_factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id uuid NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  nom_fichier text NOT NULL,
  url text NOT NULL,
  destinataire text NOT NULL CHECK (destinataire IN ('Finally Academy', 'Massena Group', 'El Najia Dechar')),
  montant numeric,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseur_factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fournisseur_factures" ON public.fournisseur_factures FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can insert fournisseur_factures" ON public.fournisseur_factures FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select fournisseur_factures" ON public.fournisseur_factures FOR SELECT USING (true);

-- Storage bucket pour les documents fournisseurs
INSERT INTO storage.buckets (id, name, public) VALUES ('fournisseur-documents', 'fournisseur-documents', false);

CREATE POLICY "Public can upload fournisseur docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fournisseur-documents');
CREATE POLICY "Public can read fournisseur docs" ON storage.objects FOR SELECT USING (bucket_id = 'fournisseur-documents');

-- Triggers updated_at
CREATE TRIGGER update_fournisseurs_updated_at BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fournisseur_apprenants_updated_at BEFORE UPDATE ON public.fournisseur_apprenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
