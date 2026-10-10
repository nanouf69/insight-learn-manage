CREATE OR REPLACE FUNCTION public.regulariser_alerte_exam_result_missing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Annotation additive : l'alerte n'est jamais supprimée, seulement marquée
  -- lue avec la preuve (identifiant de la note arrivée ensuite).
  UPDATE public.alertes_systeme a
     SET lu = true,
         details = (a.details::jsonb || jsonb_build_object(
           'regularisee_at', now(),
           'regularisee_par_resultat_id', NEW.id,
           'regularisee_tentative', NEW.tentative))::text
   WHERE a.type = 'exam_result_missing'
     AND a.lu = false
     AND a.created_at > now() - interval '1 day'
     AND left(a.details, 1) = '{'
     AND (a.details::jsonb ->> 'apprenant_id') = NEW.apprenant_id::text
     AND (a.details::jsonb ->> 'quiz_id') = NEW.quiz_id
     AND (a.details::jsonb ->> 'matiere_id') = COALESCE(NEW.matiere_id, '')
     AND (a.details::jsonb ->> 'tentative') = NEW.tentative::text;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'regulariser_alerte_exam_result_missing: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_regulariser_alerte_exam_result_missing ON public.apprenant_quiz_results;
CREATE TRIGGER trg_regulariser_alerte_exam_result_missing
AFTER INSERT ON public.apprenant_quiz_results
FOR EACH ROW EXECUTE FUNCTION public.regulariser_alerte_exam_result_missing();