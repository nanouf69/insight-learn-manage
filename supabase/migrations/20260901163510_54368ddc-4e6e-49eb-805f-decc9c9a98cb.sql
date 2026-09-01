CREATE TABLE public.factures_electroniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sens TEXT NOT NULL DEFAULT 'emise',
  pdp_document_id TEXT,
  numero TEXT,
  partenaire_nom TEXT,
  partenaire_siren TEXT,
  montant_ht NUMERIC,
  montant_tva NUMERIC,
  montant_ttc NUMERIC,
  devise TEXT NOT NULL DEFAULT 'EUR',
  date_emission DATE,
  date_echeance DATE,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  derniere_erreur TEXT,
  format TEXT NOT NULL DEFAULT 'Factur-X',
  environnement TEXT NOT NULL DEFAULT 'sandbox',
  fichier_url TEXT,
  raw JSONB,
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  fournisseur_facture_id UUID REFERENCES public.fournisseur_factures(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX factures_electroniques_pdp_doc_uidx
  ON public.factures_electroniques (environnement, pdp_document_id)
  WHERE pdp_document_id IS NOT NULL;
CREATE INDEX factures_electroniques_sens_idx ON public.factures_electroniques (sens, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.factures_electroniques TO authenticated;
GRANT ALL ON public.factures_electroniques TO service_role;
ALTER TABLE public.factures_electroniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read e-invoices" ON public.factures_electroniques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage e-invoices" ON public.factures_electroniques FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.facture_electronique_evenements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_electronique_id UUID NOT NULL REFERENCES public.factures_electroniques(id) ON DELETE CASCADE,
  statut TEXT NOT NULL,
  libelle TEXT,
  date_evenement TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX facture_electronique_evenements_fk_idx ON public.facture_electronique_evenements (facture_electronique_id, date_evenement DESC);

GRANT SELECT, INSERT ON public.facture_electronique_evenements TO authenticated;
GRANT ALL ON public.facture_electronique_evenements TO service_role;
ALTER TABLE public.facture_electronique_evenements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read e-invoice events" ON public.facture_electronique_evenements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert e-invoice events" ON public.facture_electronique_evenements FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_factures_electroniques_updated_at
  BEFORE UPDATE ON public.factures_electroniques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();