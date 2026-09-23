-- Suivi (résolu / non résolu) des incidents techniques d'examen affichés sur le
-- tableau de bord. Table de DIAGNOSTIC uniquement : elle ne contient aucune
-- réponse, note ou résultat et ne modifie aucune donnée pédagogique.
CREATE TABLE IF NOT EXISTS public.incidents_examens_statut (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_cle text NOT NULL UNIQUE,
  code text NOT NULL,
  attempt_id uuid,
  apprenant_id uuid,
  exam_id text,
  matiere text,
  resolu boolean NOT NULL DEFAULT true,
  resolu_le timestamptz NOT NULL DEFAULT now(),
  resolu_par uuid,
  note text
);

GRANT SELECT, INSERT, UPDATE ON public.incidents_examens_statut TO authenticated;
GRANT ALL ON public.incidents_examens_statut TO service_role;

ALTER TABLE public.incidents_examens_statut ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins lisent les statuts d'incidents"
  ON public.incidents_examens_statut FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins marquent un incident resolu"
  ON public.incidents_examens_statut FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins mettent a jour un statut d'incident"
  ON public.incidents_examens_statut FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS incidents_examens_statut_resolu_idx
  ON public.incidents_examens_statut (resolu, resolu_le DESC);