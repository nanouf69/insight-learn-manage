CREATE TABLE public.demandes_inscription_urgentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  apprenant_nom text,
  apprenant_prenom text,
  formation text,
  examen_libelle text NOT NULL,
  date_examen date NOT NULL,
  date_limite date NOT NULL,
  statut_inscription text,
  jours_restants integer,
  statut text NOT NULL DEFAULT 'a_traiter',
  email_destinataire text NOT NULL DEFAULT 'contact@ftransport.fr',
  email_statut text NOT NULL DEFAULT 'en_attente',
  email_erreur text,
  email_envoye_at timestamptz,
  traitee_at timestamptz,
  traitee_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demandes_inscription_urgentes_statut_chk CHECK (statut IN ('a_traiter','traitee')),
  CONSTRAINT demandes_inscription_urgentes_email_chk CHECK (email_statut IN ('en_attente','envoye','echec'))
);
GRANT SELECT, UPDATE ON public.demandes_inscription_urgentes TO authenticated;
GRANT ALL ON public.demandes_inscription_urgentes TO service_role;
ALTER TABLE public.demandes_inscription_urgentes ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX demandes_inscription_urgentes_une_active
  ON public.demandes_inscription_urgentes (apprenant_id, date_examen) WHERE statut = 'a_traiter';
CREATE POLICY "Admins lisent les demandes urgentes" ON public.demandes_inscription_urgentes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins traitent les demandes urgentes" ON public.demandes_inscription_urgentes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));