CREATE OR REPLACE FUNCTION public.examens_blancs_valider_si_complet(_apprenant_id uuid, _exam_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _m integer;
BEGIN
  IF _apprenant_id IS NULL OR _exam_id IS NULL THEN RETURN; END IF;
  FOR _m IN SELECT DISTINCT module_id FROM public.examens_blancs_parcours WHERE exam_id = _exam_id LOOP
    IF (public.examens_blancs_controle(_apprenant_id, _m)->>'complet')::boolean IS TRUE THEN
      -- Écrit seulement « completed » ; ne fait jamais reculer un statut.
      INSERT INTO public.apprenant_module_completion (apprenant_id, module_id, status, progress, completed_at, details)
      VALUES (_apprenant_id, _m, 'completed', 100, now(), jsonb_build_array(jsonb_build_object('source', 'regle_serveur_examens_blancs_6_sur_6', 'at', now())))
      ON CONFLICT (apprenant_id, module_id) DO UPDATE
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE public.apprenant_module_completion.status IS DISTINCT FROM 'completed';
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.examens_blancs_valider_si_complet(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_examens_blancs_6_sur_6()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    IF TG_TABLE_NAME = 'apprenant_quiz_results' THEN
      IF NEW.quiz_type = 'examen_blanc' THEN
        PERFORM public.examens_blancs_valider_si_complet(NEW.apprenant_id, NEW.quiz_id);
      END IF;
    ELSIF TG_TABLE_NAME = 'exam_attempts_v2' THEN
      IF NEW.etat = 'terminee' AND NOT coalesce(NEW.is_test, false)
         AND (TG_OP = 'INSERT' OR OLD.etat IS DISTINCT FROM 'terminee') THEN
        PERFORM public.examens_blancs_valider_si_complet(NEW.apprenant_id, NEW.exam_id);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    -- Ne bloque jamais la remise d'un examen.
    RAISE WARNING 'examens_blancs_6_sur_6: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_zz_examens_blancs_6_sur_6
AFTER INSERT ON public.apprenant_quiz_results
FOR EACH ROW EXECUTE FUNCTION public.trg_examens_blancs_6_sur_6();

CREATE TRIGGER trg_zz_examens_blancs_6_sur_6
AFTER INSERT OR UPDATE OF etat ON public.exam_attempts_v2
FOR EACH ROW EXECUTE FUNCTION public.trg_examens_blancs_6_sur_6();