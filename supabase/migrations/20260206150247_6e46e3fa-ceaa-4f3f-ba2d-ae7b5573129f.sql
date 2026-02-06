-- Table pour suivre les documents d'inscription
CREATE TABLE public.documents_inscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  type_document TEXT NOT NULL, -- piece_identite, permis_conduire, justificatif_domicile, photo_identite, signature, custom
  titre TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  nom_fichier TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'pending', -- pending, valid, rejected
  motif_refus TEXT,
  analyse_ia_date TIMESTAMPTZ,
  analyse_ia_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par apprenant
CREATE INDEX idx_documents_inscription_apprenant ON public.documents_inscription(apprenant_id);

-- Trigger pour updated_at
CREATE TRIGGER update_documents_inscription_updated_at
  BEFORE UPDATE ON public.documents_inscription
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS - Accès public pour l'instant (pas d'auth)
ALTER TABLE public.documents_inscription ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to documents_inscription"
  ON public.documents_inscription
  FOR ALL
  USING (true)
  WITH CHECK (true);