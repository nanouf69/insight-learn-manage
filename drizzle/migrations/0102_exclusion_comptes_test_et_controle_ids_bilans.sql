CREATE OR REPLACE FUNCTION public.est_compte_test(_apprenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id = _apprenant_id);
$$;
GRANT EXECUTE ON FUNCTION public.est_compte_test(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.est_proprietaire_apprenant(_apprenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.est_proprietaire_apprenant(uuid) TO authenticated, service_role;

-- Comptes de test invisibles des écrans et statistiques (seul le compte lui-même se voit)
CREATE POLICY "Comptes test exclus des lectures" ON public.apprenants AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.est_compte_test(id) OR auth_user_id = auth.uid());
CREATE POLICY "Comptes test exclus des lectures" ON public.apprenant_module_completion AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.est_compte_test(apprenant_id) OR public.est_proprietaire_apprenant(apprenant_id));
CREATE POLICY "Comptes test exclus des lectures" ON public.reponses_apprenants AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.est_compte_test(apprenant_id) OR public.est_proprietaire_apprenant(apprenant_id));
CREATE POLICY "Comptes test exclus des lectures" ON public.apprenant_quiz_results AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT public.est_compte_test(apprenant_id) OR public.est_proprietaire_apprenant(apprenant_id));

-- Futurs Bilans : refuser un identifiant d'exercice incompatible, sans rien modifier
CREATE OR REPLACE FUNCTION public.bilan_controle_compatibilite_ids()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_bad text;
BEGIN
  IF NOT COALESCE((SELECT actif FROM bilan_identite_flags WHERE module_id = NEW.module_id), false) THEN RETURN NEW; END IF;
  SELECT string_agg(COALESCE(e->>'id','(vide)'), ', ') INTO v_bad
  FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) e
  WHERE COALESCE(e->>'id','') !~ '^-?[0-9]{1,9}$';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'BILAN_ID_INCOMPATIBLE : identifiant(s) d''exercice non pris en charge par la protection des Bilans (module %) : %. Enregistrement refusé, aucun identifiant modifié.', NEW.module_id, v_bad
      USING ERRCODE = 'P0510';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bilan_aa_controle_ids BEFORE INSERT OR UPDATE OF module_data ON public.module_editor_state
  FOR EACH ROW EXECUTE FUNCTION public.bilan_controle_compatibilite_ids();