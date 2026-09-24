-- Garde : un ancien passage ROUGE est conservé tel quel ; aucune écriture élève/serveur sur sa tentative.
CREATE OR REPLACE FUNCTION public.bilan_garde_passage_rouge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m text[];
BEGIN
  m := regexp_match(OLD.exercice_id, '^module_(5|11)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.tentative, OLD.tentative) <> COALESCE(OLD.tentative, 1) THEN
    IF current_setting('app.bilan_rouge_ouverture', true) = '1' THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bilan_passage_categories c
                 WHERE c.apprenant_id = OLD.apprenant_id AND c.module_id = m[1]::int AND c.exercice_id = m[2]::int
                   AND c.tentative = COALESCE(OLD.tentative, 1) AND c.categorie = 'ROUGE') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF current_setting('app.bilan_rouge_ouverture', true) = '1' THEN RETURN NEW; END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed IS DISTINCT FROM OLD.completed OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.tentative IS DISTINCT FROM OLD.tentative THEN
    RAISE EXCEPTION 'Ancien passage conservé : nouvelle tentative à autoriser par l''Admin' USING ERRCODE = 'P0499';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_0c_bilan_garde_passage_rouge ON public.reponses_apprenants;
CREATE TRIGGER trg_0c_bilan_garde_passage_rouge BEFORE UPDATE ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.bilan_garde_passage_rouge();

-- Ouverture d'une matière Bilan par l'élève connecté : fige un NOUVEAU passage,
-- ou ouvre la tentative autorisée par l'Admin après un passage ROUGE. Sinon ne fait rien.
CREATE OR REPLACE FUNCTION public.bilan_ouvrir_passage_eleve(p_module_id integer, p_exercice_id integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_app uuid; v_row reponses_apprenants%ROWTYPE; v_cat bilan_passage_categories%ROWTYPE;
        v_aut bilan_nouvelle_tentative_autorisations%ROWTYPE; s bilan_passage_snapshots; v_cle text;
BEGIN
  IF p_module_id NOT IN (5, 11) THEN RETURN jsonb_build_object('statut','non_concerne'); END IF;
  SELECT a.id INTO v_app FROM apprenants a WHERE (a.auth_user_id = auth.uid() OR a.id = auth.uid()) LIMIT 1;
  IF v_app IS NULL OR NOT public.is_current_user_apprenant(v_app) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE((SELECT actif FROM bilan_snapshot_flags WHERE module_id = p_module_id), false) THEN
    RETURN jsonb_build_object('statut','ancien');
  END IF;
  v_cle := 'module_'||p_module_id||'_exo_'||p_exercice_id;
  PERFORM pg_advisory_xact_lock(hashtextextended('ouvrir:'||v_app||':'||v_cle, 0));
  SELECT * INTO v_cat FROM bilan_passage_categories
   WHERE apprenant_id = v_app AND module_id = p_module_id AND exercice_id = p_exercice_id
   ORDER BY tentative DESC LIMIT 1;
  SELECT * INTO s FROM bilan_passage_snapshots
   WHERE apprenant_id = v_app AND module_id = p_module_id AND exercice_id = p_exercice_id
   ORDER BY tentative DESC LIMIT 1;
  IF s.id IS NOT NULL AND (v_cat.id IS NULL OR s.tentative >= v_cat.tentative) THEN
    RETURN jsonb_build_object('statut','fige','snapshot_id',s.id,'tentative',s.tentative);
  END IF;
  SELECT * INTO v_row FROM reponses_apprenants WHERE apprenant_id = v_app AND exercice_id = v_cle LIMIT 1;
  IF v_cat.categorie = 'ROUGE' THEN
    SELECT * INTO v_aut FROM bilan_nouvelle_tentative_autorisations
     WHERE apprenant_id = v_app AND module_id = p_module_id AND exercice_id = p_exercice_id
       AND tentative_autorisee > v_cat.tentative ORDER BY tentative_autorisee DESC LIMIT 1;
    IF v_aut.id IS NULL THEN RETURN jsonb_build_object('statut','rouge_bloque'); END IF;
    -- Ancien passage archivé tel quel, puis tentative autorisée ouverte vide.
    IF v_row.id IS NOT NULL AND COALESCE(v_row.tentative,1) < v_aut.tentative_autorisee THEN
      INSERT INTO reponses_apprenants_historique(apprenant_id, user_id, exercice_id, exercice_type, tentative,
        reponses, score, bonnes_reponses, total_questions, status, submitted_at)
      VALUES (v_row.apprenant_id, v_row.user_id, v_row.exercice_id, v_row.exercice_type, v_row.tentative,
        v_row.reponses, v_row.score, v_row.bonnes_reponses, v_row.total_questions, v_row.status, v_row.submitted_at);
      PERFORM set_config('app.bilan_rouge_ouverture', '1', true);
      UPDATE reponses_apprenants SET tentative = v_aut.tentative_autorisee WHERE id = v_row.id;
      PERFORM set_config('app.bilan_rouge_ouverture', '', true);
    END IF;
    s := public.bilan_demarrer_passage(v_app, p_module_id, p_exercice_id, v_aut.tentative_autorisee, NULL);
    RETURN jsonb_build_object('statut','fige','snapshot_id',s.id,'tentative',s.tentative);
  END IF;
  IF v_cat.id IS NOT NULL OR v_row.id IS NOT NULL
     OR EXISTS (SELECT 1 FROM bilan_passages_figes f JOIN reponses_apprenants r ON r.id = f.reponse_apprenant_id
                WHERE r.apprenant_id = v_app AND r.exercice_id = v_cle) THEN
    RETURN jsonb_build_object('statut','ancien');
  END IF;
  s := public.bilan_demarrer_passage(v_app, p_module_id, p_exercice_id, 1, NULL);
  RETURN jsonb_build_object('statut','fige','snapshot_id',s.id,'tentative',s.tentative);
END $$;

REVOKE ALL ON FUNCTION public.bilan_ouvrir_passage_eleve(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bilan_ouvrir_passage_eleve(integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.bilan_garde_passage_rouge() FROM PUBLIC, anon, authenticated;