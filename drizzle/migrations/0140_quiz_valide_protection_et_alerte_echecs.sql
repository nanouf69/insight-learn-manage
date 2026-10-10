-- (1) Journal des échecs de validation (append-only, sans réponses)
CREATE TABLE public.quiz_validation_echecs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id text NOT NULL,
  etape text NOT NULL,
  alerte_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_validation_echecs TO authenticated;
GRANT ALL ON public.quiz_validation_echecs TO service_role;
ALTER TABLE public.quiz_validation_echecs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les echecs de validation" ON public.quiz_validation_echecs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_quiz_validation_echecs_cle ON public.quiz_validation_echecs (apprenant_id, exercice_id, created_at DESC);
CREATE TRIGGER trg_quiz_validation_echecs_append_only BEFORE UPDATE OR DELETE ON public.quiz_validation_echecs
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();

CREATE OR REPLACE FUNCTION public.signaler_echec_validation_quiz(
  _apprenant_id uuid, _module_id integer, _exercice_id text, _etape text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nb integer; v_recent integer; v_alerte uuid; v_nom text; v_etape text;
BEGIN
  IF _apprenant_id IS NULL OR _module_id IS NULL OR _exercice_id IS NULL
     OR _exercice_id !~ '^module_[0-9]{1,4}_(revision_)?exo_[0-9]{1,20}$' THEN
    RETURN jsonb_build_object('enregistre', false, 'raison', 'parametres_invalides');
  END IF;
  v_etape := left(regexp_replace(coalesce(_etape, 'inconnue'), '[^a-zA-Z0-9_ -]', '', 'g'), 40);
  SELECT trim(coalesce(prenom,'') || ' ' || coalesce(nom,'')) INTO v_nom FROM public.apprenants WHERE id = _apprenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enregistre', false, 'raison', 'apprenant_inconnu');
  END IF;
  -- Anti-saturation : au plus 30 signalements par élève et par 15 minutes.
  SELECT count(*) INTO v_recent FROM public.quiz_validation_echecs
   WHERE apprenant_id = _apprenant_id AND created_at > now() - interval '15 minutes';
  IF v_recent >= 30 THEN
    RETURN jsonb_build_object('enregistre', false, 'raison', 'limite');
  END IF;

  INSERT INTO public.quiz_validation_echecs (apprenant_id, module_id, exercice_id, etape)
  VALUES (_apprenant_id, _module_id, _exercice_id, v_etape);

  SELECT count(*) INTO v_nb FROM public.quiz_validation_echecs
   WHERE apprenant_id = _apprenant_id AND exercice_id = _exercice_id AND created_at > now() - interval '15 minutes';

  IF v_nb >= 3 AND NOT EXISTS (
       SELECT 1 FROM public.quiz_validation_echecs
        WHERE apprenant_id = _apprenant_id AND exercice_id = _exercice_id
          AND alerte_id IS NOT NULL AND created_at > now() - interval '60 minutes') THEN
    INSERT INTO public.alertes_systeme (type, titre, message, details, lu)
    VALUES ('quiz_validation_echecs',
            'Validation de quiz bloquée — ' || coalesce(nullif(v_nom,''), 'élève'),
            'Module ' || _module_id || ' : ' || v_nb || ' échecs de validation en 15 minutes (dernière étape : ' || v_etape || ').',
            jsonb_build_object('apprenant_id', _apprenant_id, 'module_id', _module_id,
                               'exercice_id', _exercice_id, 'etape', v_etape, 'echecs_15_min', v_nb)::text,
            false)
    RETURNING id INTO v_alerte;
    -- Trace de l'alerte : nouvelle ligne (journal append-only, jamais modifié).
    INSERT INTO public.quiz_validation_echecs (apprenant_id, module_id, exercice_id, etape, alerte_id)
    VALUES (_apprenant_id, _module_id, _exercice_id, 'alerte_emise', v_alerte);
  END IF;
  RETURN jsonb_build_object('enregistre', true, 'echecs_15_min', v_nb, 'alerte_id', v_alerte);
END; $$;
REVOKE ALL ON FUNCTION public.signaler_echec_validation_quiz(uuid, integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.signaler_echec_validation_quiz(uuid, integer, text, text) TO anon, authenticated, service_role;

-- (2) Réécritures refusées d'un quiz déjà validé (traçabilité, sans contenu des réponses)
CREATE TABLE public.quiz_valide_reecritures_refusees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_cible text NOT NULL,
  apprenant_id uuid NOT NULL,
  cle text NOT NULL,
  champs text[] NOT NULL DEFAULT '{}',
  auteur uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_valide_reecritures_refusees TO authenticated;
GRANT ALL ON public.quiz_valide_reecritures_refusees TO service_role;
ALTER TABLE public.quiz_valide_reecritures_refusees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les reecritures refusees" ON public.quiz_valide_reecritures_refusees
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_quiz_valide_reecritures_append_only BEFORE UPDATE OR DELETE ON public.quiz_valide_reecritures_refusees
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();

CREATE OR REPLACE FUNCTION public.garde_quiz_module_valide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_champs text[] := '{}';
BEGIN
  IF OLD.status IS DISTINCT FROM 'submitted'
     OR OLD.exercice_id !~ '^module_[0-9]+_exo_[0-9]+$'          -- révisions, EB, bilans : non concernés
     OR COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative     -- nouvelle tentative Admin (archivée)
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses AND NEW.reponses IS NOT NULL AND NEW.reponses <> '{}'::jsonb THEN
    v_champs := v_champs || 'reponses';
    -- Les réponses proposées ne sont pas perdues : copie dans l'historique.
    INSERT INTO public.reponses_apprenants_historique (apprenant_id, user_id, exercice_id, exercice_type, tentative,
      reponses, score, bonnes_reponses, total_questions, status, submitted_at)
    VALUES (OLD.apprenant_id, NEW.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
      NEW.reponses, NEW.score, NEW.bonnes_reponses, NEW.total_questions, 'reecriture_refusee', NULL);
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score THEN v_champs := v_champs || 'score'; END IF;
  IF NEW.bonnes_reponses IS DISTINCT FROM OLD.bonnes_reponses THEN v_champs := v_champs || 'bonnes_reponses'; END IF;
  IF NEW.total_questions IS DISTINCT FROM OLD.total_questions THEN v_champs := v_champs || 'total_questions'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_champs := v_champs || 'status'; END IF;
  IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN v_champs := v_champs || 'submitted_at'; END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed THEN v_champs := v_champs || 'completed'; END IF;

  NEW.reponses := OLD.reponses; NEW.score := OLD.score; NEW.bonnes_reponses := OLD.bonnes_reponses;
  NEW.total_questions := OLD.total_questions; NEW.status := OLD.status; NEW.submitted_at := OLD.submitted_at;
  NEW.completed := OLD.completed; NEW.tentative := OLD.tentative;

  IF array_length(v_champs, 1) > 0 THEN
    INSERT INTO public.quiz_valide_reecritures_refusees (table_cible, apprenant_id, cle, champs, auteur)
    VALUES ('reponses_apprenants', OLD.apprenant_id, OLD.exercice_id, v_champs, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_00_garde_quiz_module_valide BEFORE UPDATE ON public.reponses_apprenants
  FOR EACH ROW EXECUTE FUNCTION public.garde_quiz_module_valide();

-- Module déjà « Terminé » : la note et le détail validés ne sont plus réécrits par l'élève.
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
    v_champs := v_champs || 'score_obtenu'; NEW.score_obtenu := OLD.score_obtenu; END IF;
  IF OLD.score_max IS NOT NULL AND NEW.score_max IS DISTINCT FROM OLD.score_max THEN
    v_champs := v_champs || 'score_max'; NEW.score_max := OLD.score_max; END IF;
  IF jsonb_typeof(OLD.details) = 'array' AND jsonb_array_length(OLD.details) > 0
     AND NEW.details IS DISTINCT FROM OLD.details THEN
    v_champs := v_champs || 'details'; NEW.details := OLD.details; END IF;
  IF NEW.status IS DISTINCT FROM 'completed' THEN v_champs := v_champs || 'status'; NEW.status := 'completed'; END IF;
  IF array_length(v_champs, 1) > 0 THEN
    INSERT INTO public.quiz_valide_reecritures_refusees (table_cible, apprenant_id, cle, champs, auteur)
    VALUES ('apprenant_module_completion', OLD.apprenant_id, 'module_' || OLD.module_id, v_champs, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_00_garde_module_termine_note BEFORE UPDATE ON public.apprenant_module_completion
  FOR EACH ROW EXECUTE FUNCTION public.garde_module_termine_note();