CREATE TABLE public.qualiopi_matrice_correspondance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ref_key text NOT NULL UNIQUE,
 preuve_id uuid NOT NULL REFERENCES public.qualiopi_preuves(id),
 matiere text NOT NULL,
 competence_officielle text NOT NULL,
 contenu_cours text NOT NULL DEFAULT '',
 reference_diapos text NOT NULL DEFAULT '',
 evaluation_quiz text NOT NULL DEFAULT '',
 couverture text NOT NULL DEFAULT 'a_verifier' CHECK (couverture IN ('verifiee','a_verifier','manquante')),
 observations text NOT NULL DEFAULT '',
 source_modele text NOT NULL DEFAULT 'Transcription utilisateur du modèle indicateur 7.docx ; original non reçu',
 referentiel_url text NOT NULL DEFAULT '',
 verification_source text,
 verifie_le timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.qualiopi_matrice_correspondance TO authenticated;
GRANT ALL ON public.qualiopi_matrice_correspondance TO service_role;
ALTER TABLE public.qualiopi_matrice_correspondance ENABLE ROW LEVEL SECURITY;
CREATE POLICY matrice_admin_select ON public.qualiopi_matrice_correspondance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY matrice_admin_insert ON public.qualiopi_matrice_correspondance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY matrice_admin_update ON public.qualiopi_matrice_correspondance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.qualiopi_matrice_correspondance IS 'Documentary correspondence only; declared references never establish verified coverage or alter courses or learner evidence.';