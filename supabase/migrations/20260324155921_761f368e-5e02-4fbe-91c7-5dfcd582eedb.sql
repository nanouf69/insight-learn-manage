-- Sécurise les examens blancs côté apprenant : pas de modification des résultats finaux, pas de suppression/réinitialisation des réponses

-- 1) Empêcher les apprenants de modifier un résultat d'examen déjà enregistré
DROP POLICY IF EXISTS "Learner can update own quiz results"
ON public.apprenant_quiz_results;

-- 2) Empêcher les apprenants de supprimer leurs réponses (reset manuel)
DROP POLICY IF EXISTS "Students can delete own reponses"
ON public.reponses_apprenants;

-- 3) Autoriser l'update uniquement sur des réponses en cours (completed = false)
DROP POLICY IF EXISTS "Learner can update own reponses"
ON public.reponses_apprenants;

CREATE POLICY "Learner can update own in_progress reponses"
ON public.reponses_apprenants
FOR UPDATE
TO authenticated
USING (
  is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
  AND COALESCE(completed, false) = false
)
WITH CHECK (
  is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

-- 4) Bloquer l'ajout de doublons de résultats (même apprenant + même examen + même matière)
--    pour empêcher qu'un apprenant "rajoute" une nouvelle tentative non autorisée.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_quiz_result_insert_for_learners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Le service_role et les admins gardent la main (imports, support, corrections)
  IF COALESCE(auth.role(), '') = 'service_role' OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.apprenant_quiz_results r
    WHERE r.apprenant_id = NEW.apprenant_id
      AND r.quiz_type = NEW.quiz_type
      AND r.quiz_id = NEW.quiz_id
      AND COALESCE(r.matiere_id, '') = COALESCE(NEW.matiere_id, '')
  ) THEN
    RAISE EXCEPTION 'Résultat déjà enregistré pour cette matière. Réinitialisation requise côté administration.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_quiz_result_insert_for_learners
ON public.apprenant_quiz_results;

CREATE TRIGGER trg_prevent_duplicate_quiz_result_insert_for_learners
BEFORE INSERT ON public.apprenant_quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_quiz_result_insert_for_learners();