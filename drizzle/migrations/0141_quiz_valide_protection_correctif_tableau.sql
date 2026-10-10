CREATE OR REPLACE FUNCTION public.garde_quiz_module_valide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_champs text[] := '{}';
BEGIN
  IF OLD.status IS DISTINCT FROM 'submitted'
     OR OLD.exercice_id !~ '^module_[0-9]+_exo_[0-9]+$'
     OR COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses AND NEW.reponses IS NOT NULL AND NEW.reponses <> '{}'::jsonb THEN
    v_champs := array_append(v_champs, 'reponses');
    INSERT INTO public.reponses_apprenants_historique (apprenant_id, user_id, exercice_id, exercice_type, tentative,
      reponses, score, bonnes_reponses, total_questions, status, submitted_at)
    VALUES (OLD.apprenant_id, NEW.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
      NEW.reponses, NEW.score, NEW.bonnes_reponses, NEW.total_questions, 'reecriture_refusee', NULL);
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score THEN v_champs := array_append(v_champs, 'score'); END IF;
  IF NEW.bonnes_reponses IS DISTINCT FROM OLD.bonnes_reponses THEN v_champs := array_append(v_champs, 'bonnes_reponses'); END IF;
  IF NEW.total_questions IS DISTINCT FROM OLD.total_questions THEN v_champs := array_append(v_champs, 'total_questions'); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_champs := array_append(v_champs, 'status'); END IF;
  IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN v_champs := array_append(v_champs, 'submitted_at'); END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed THEN v_champs := array_append(v_champs, 'completed'); END IF;
  NEW.reponses := OLD.reponses; NEW.score := OLD.score; NEW.bonnes_reponses := OLD.bonnes_reponses;
  NEW.total_questions := OLD.total_questions; NEW.status := OLD.status; NEW.submitted_at := OLD.submitted_at;
  NEW.completed := OLD.completed; NEW.tentative := OLD.tentative;
  IF array_length(v_champs, 1) > 0 THEN
    INSERT INTO public.quiz_valide_reecritures_refusees (table_cible, apprenant_id, cle, champs, auteur)
    VALUES ('reponses_apprenants', OLD.apprenant_id, OLD.exercice_id, v_champs, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.garde_module_termine_note()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_champs text[] := '{}';
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed'
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF OLD.score_obtenu IS NOT NULL AND NEW.score_obtenu IS DISTINCT FROM OLD.score_obtenu THEN
    v_champs := array_append(v_champs, 'score_obtenu'); NEW.score_obtenu := OLD.score_obtenu; END IF;
  IF OLD.score_max IS NOT NULL AND NEW.score_max IS DISTINCT FROM OLD.score_max THEN
    v_champs := array_append(v_champs, 'score_max'); NEW.score_max := OLD.score_max; END IF;
  IF jsonb_typeof(OLD.details) = 'array' AND jsonb_array_length(OLD.details) > 0
     AND NEW.details IS DISTINCT FROM OLD.details THEN
    v_champs := array_append(v_champs, 'details'); NEW.details := OLD.details; END IF;
  IF NEW.status IS DISTINCT FROM 'completed' THEN v_champs := array_append(v_champs, 'status'); NEW.status := 'completed'; END IF;
  IF array_length(v_champs, 1) > 0 THEN
    INSERT INTO public.quiz_valide_reecritures_refusees (table_cible, apprenant_id, cle, champs, auteur)
    VALUES ('apprenant_module_completion', OLD.apprenant_id, 'module_' || OLD.module_id, v_champs, auth.uid());
  END IF;
  RETURN NEW;
END; $$;