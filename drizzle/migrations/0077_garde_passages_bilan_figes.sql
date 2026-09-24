GRANT SELECT ON public.bilan_passages_figes TO authenticated;
GRANT ALL ON public.bilan_passages_figes TO service_role;

CREATE POLICY "Apprenant lit ses propres passages figés"
ON public.bilan_passages_figes FOR SELECT TO authenticated
USING (public.is_current_user_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.garde_passage_bilan_fige()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bilan_passages_figes f
                 WHERE f.reponse_apprenant_id = OLD.id AND f.tentative = OLD.tentative) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PASSAGE_FIGE: passage archivé, suppression interdite' USING ERRCODE = 'P0490';
  END IF;
  -- Nouvelle tentative distincte : uniquement sur décision admin (ou serveur)
  IF COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative THEN
    IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'PASSAGE_FIGE: nouvelle tentative réservée à un administrateur' USING ERRCODE = 'P0490';
  END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed IS DISTINCT FROM OLD.completed
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.bonnes_reponses IS DISTINCT FROM OLD.bonnes_reponses
     OR NEW.total_questions IS DISTINCT FROM OLD.total_questions
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'PASSAGE_FIGE: passage archivé, aucune nouvelle réponse acceptée' USING ERRCODE = 'P0490';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_0_garde_passage_bilan_fige
BEFORE UPDATE OR DELETE ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.garde_passage_bilan_fige();