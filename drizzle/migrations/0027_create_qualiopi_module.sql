CREATE TABLE public.qualiopi_indicateurs_etat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicateur INTEGER NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'a_completer',
  applicable BOOLEAN NOT NULL DEFAULT true,
  responsable TEXT,
  commentaire_auditeur TEXT,
  date_verification DATE,
  maj_annuelle BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualiopi_indicateurs_etat TO authenticated;
GRANT ALL ON public.qualiopi_indicateurs_etat TO service_role;
ALTER TABLE public.qualiopi_indicateurs_etat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qualiopi_indicateurs_etat" ON public.qualiopi_indicateurs_etat
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.qualiopi_preuves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  date_preuve DATE,
  valide_du DATE,
  valide_au DATE,
  fichiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  lien_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload',
  source_table TEXT,
  source_id TEXT,
  archivee BOOLEAN NOT NULL DEFAULT false,
  archivee_le TIMESTAMPTZ,
  remplace_preuve_id UUID REFERENCES public.qualiopi_preuves(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualiopi_preuves TO authenticated;
GRANT ALL ON public.qualiopi_preuves TO service_role;
ALTER TABLE public.qualiopi_preuves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qualiopi_preuves" ON public.qualiopi_preuves
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.qualiopi_preuve_liens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preuve_id UUID NOT NULL REFERENCES public.qualiopi_preuves(id) ON DELETE CASCADE,
  indicateur INTEGER NOT NULL,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (preuve_id, indicateur)
);

CREATE INDEX idx_qualiopi_preuve_liens_indicateur ON public.qualiopi_preuve_liens(indicateur);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qualiopi_preuve_liens TO authenticated;
GRANT ALL ON public.qualiopi_preuve_liens TO service_role;
ALTER TABLE public.qualiopi_preuve_liens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qualiopi_preuve_liens" ON public.qualiopi_preuve_liens
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_qualiopi_etat_updated BEFORE UPDATE ON public.qualiopi_indicateurs_etat
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qualiopi_preuves_updated BEFORE UPDATE ON public.qualiopi_preuves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();