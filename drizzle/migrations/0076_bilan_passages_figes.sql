CREATE TABLE public.bilan_passages_figes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reponse_apprenant_id uuid NOT NULL UNIQUE,
  apprenant_id uuid,
  module_id integer NOT NULL,
  exercice_id text NOT NULL,
  statut_passage text,
  tentative integer,
  passage_created_at timestamptz,
  passage_updated_at timestamptz,
  reponses jsonb NOT NULL,
  cle_figee jsonb NOT NULL,
  score_bonnes integer NOT NULL,
  nb_repondues integer NOT NULL,
  nb_questions integer NOT NULL,
  empreinte_passage text NOT NULL,
  motif text NOT NULL,
  fige_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bilan_passages_figes TO authenticated;
GRANT ALL ON public.bilan_passages_figes TO service_role;
ALTER TABLE public.bilan_passages_figes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les passages figés" ON public.bilan_passages_figes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_bilan_passages_figes_append_only
  BEFORE UPDATE OR DELETE ON public.bilan_passages_figes
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();
COMMENT ON TABLE public.bilan_passages_figes IS 'Copie figée append-only des passages Bilan (réponses, clé en place au moment du gel, score). Jamais recalculée.';