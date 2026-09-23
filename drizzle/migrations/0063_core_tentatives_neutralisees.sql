-- Neutralisation tracée des notes 0 techniques du noyau V2.
-- Additif : aucune réponse, QRC, tentative ou résultat existant n'est supprimé ni modifié.
CREATE TABLE IF NOT EXISTS public.core_tentatives_neutralisees (
  attempt_id uuid PRIMARY KEY REFERENCES public.exam_attempts_v2(attempt_id),
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  motif text NOT NULL,
  resultat_avant jsonb,
  neutralise_at timestamptz NOT NULL DEFAULT now(),
  neutralise_par text
);

GRANT SELECT ON public.core_tentatives_neutralisees TO authenticated;
GRANT ALL ON public.core_tentatives_neutralisees TO service_role;

ALTER TABLE public.core_tentatives_neutralisees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture neutralisations authentifies" ON public.core_tentatives_neutralisees;
CREATE POLICY "Lecture neutralisations authentifies"
ON public.core_tentatives_neutralisees
FOR SELECT TO authenticated
USING (true);

-- Append-only : ni modification ni suppression, même pour un admin.
CREATE OR REPLACE FUNCTION public.core_neutralisation_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'NEUTRALISATION_APPEND_ONLY: journal inaltérable (%).', OLD.attempt_id
    USING ERRCODE = 'P0477';
END;
$$;

DROP TRIGGER IF EXISTS trg_neutralisation_append_only ON public.core_tentatives_neutralisees;
CREATE TRIGGER trg_neutralisation_append_only
BEFORE UPDATE OR DELETE ON public.core_tentatives_neutralisees
FOR EACH ROW EXECUTE FUNCTION public.core_neutralisation_append_only();

COMMENT ON TABLE public.core_tentatives_neutralisees IS 'Tentatives V2 dont le résultat est une note 0 technique (clôture sans aucune réponse serveur) : exclues des écrans de correction et de résultats, jamais supprimées.';