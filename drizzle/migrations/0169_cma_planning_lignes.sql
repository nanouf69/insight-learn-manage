CREATE TABLE public.cma_planning_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  date_examen date NOT NULL,
  heure text NOT NULL,
  filiere text NOT NULL CHECK (filiere IN ('VTC','TAXI')),
  jury text,
  numero integer,
  prenom_pdf text NOT NULL,
  nom_pdf text NOT NULL,
  raison_rapprochement text,
  source_fichier text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, date_examen, heure, filiere)
);
GRANT SELECT, INSERT ON public.cma_planning_lignes TO authenticated;
GRANT ALL ON public.cma_planning_lignes TO service_role;
ALTER TABLE public.cma_planning_lignes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin lit planning cma" ON public.cma_planning_lignes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin ajoute planning cma" ON public.cma_planning_lignes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.cma_planning_lignes IS 'Lignes du planning pratique CMA importées depuis le PDF. Ajout seul (aucune modification ni suppression). Ne modifie jamais la fiche apprenant.';