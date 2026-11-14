CREATE OR REPLACE FUNCTION public.garde_quiz_module_valide()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$;
CREATE TRIGGER trg_00_garde_quiz_module_valide BEFORE UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_quiz_module_valide();
CREATE OR REPLACE FUNCTION public.garde_passage_bilan_fige()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;
CREATE TRIGGER trg_0_garde_passage_bilan_fige BEFORE DELETE OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_passage_bilan_fige();
CREATE OR REPLACE FUNCTION public.bilan_garde_reponses_verrouillees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m text[]; r record;
BEGIN
  m := regexp_match(NEW.exercice_id, '^module_(\d+)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  -- Identifiants techniques longs (> integer) : ne peuvent correspondre à aucun statut Bilan.
  IF length(m[1]) > 9 OR length(m[2]) > 9 THEN RETURN NEW; END IF;
  FOR r IN SELECT cle, reponse FROM bilan_reponse_statuts_effectifs
            WHERE apprenant_id = NEW.apprenant_id AND module_id = m[1]::int AND exercice_id = m[2]::int
              AND tentative = COALESCE(NEW.tentative, 1) AND statut <> 'CERTAINE' LOOP
    IF TG_OP = 'UPDATE' AND OLD.reponses ? r.cle THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], OLD.reponses->r.cle);
    ELSIF r.reponse IS NOT NULL THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], r.reponse);
    END IF;
  END LOOP;
  RETURN NEW;
END $function$;
CREATE TRIGGER trg_0b_bilan_reponses_verrouillees BEFORE INSERT OR UPDATE OF reponses ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION bilan_garde_reponses_verrouillees();
CREATE OR REPLACE FUNCTION public.bilan_garde_passage_rouge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m text[];
BEGIN
  m := regexp_match(OLD.exercice_id, '^module_(5|11)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  IF length(m[2]) > 9 THEN RETURN NEW; END IF;
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
END $function$;
CREATE TRIGGER trg_0c_bilan_garde_passage_rouge BEFORE UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION bilan_garde_passage_rouge();
CREATE OR REPLACE FUNCTION public.protect_reponses_apprenants_terminal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.completed = true AND NEW.status <> 'submitted' THEN
      NEW.status := 'submitted';
    END IF;
    IF NEW.status = 'submitted' THEN
      NEW.completed := true;
      NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    END IF;
    RETURN NEW;
  END IF;

  -- Nouvelle tentative explicitement demandée : archiver puis repartir à zéro
  IF COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative THEN
    IF OLD.status = 'submitted' THEN
      INSERT INTO public.reponses_apprenants_historique (
        apprenant_id, user_id, exercice_id, exercice_type, tentative,
        reponses, score, bonnes_reponses, total_questions, status, submitted_at
      ) VALUES (
        OLD.apprenant_id, OLD.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
        OLD.reponses, OLD.score, OLD.bonnes_reponses, OLD.total_questions, OLD.status, OLD.submitted_at
      );
    END IF;
    NEW.status := 'in_progress';
    NEW.completed := false;
    NEW.submitted_at := NULL;
    NEW.score := NULL;
    NEW.bonnes_reponses := NULL;
    NEW.total_questions := NULL;
    NEW.reponses := '{}'::jsonb;
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' THEN
    NEW.status := 'submitted';
    NEW.completed := true;
    NEW.submitted_at := COALESCE(NEW.submitted_at, OLD.submitted_at, now());
    NEW.score := COALESCE(NEW.score, OLD.score);
    NEW.bonnes_reponses := COALESCE(NEW.bonnes_reponses, OLD.bonnes_reponses);
    NEW.total_questions := COALESCE(NEW.total_questions, OLD.total_questions);
    NEW.tentative := GREATEST(COALESCE(NEW.tentative, 1), OLD.tentative);
    IF NEW.reponses IS NULL OR NEW.reponses = '{}'::jsonb THEN
      NEW.reponses := OLD.reponses;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.completed = true AND NEW.status <> 'submitted' THEN
    NEW.status := 'submitted';
  END IF;
  IF NEW.status = 'submitted' THEN
    NEW.completed := true;
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;
  NEW.tentative := GREATEST(COALESCE(NEW.tentative, 1), OLD.tentative);
  RETURN NEW;
END;
$function$;
CREATE TRIGGER trg_protect_reponses_apprenants_terminal BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION protect_reponses_apprenants_terminal();
CREATE OR REPLACE FUNCTION public.ensure_quiz_result_on_matiere_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz_id text;
  v_matiere_raw text;
  v_matiere text;
  v_tentative integer := 1;
  v_exists boolean;
  v_apprenant_exists boolean;
  m text[];
  t text[];
  v_retake_tentative integer;
BEGIN
  IF NEW.exercice_type IS DISTINCT FROM 'examen_blanc' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.completed, false) <> true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.completed, false) = true THEN
    RETURN NEW;
  END IF;

  m := regexp_match(NEW.exercice_id, '^((?:EB|eb)\d+(?:-[a-zA-Z0-9]+)?|bilan-[^_]+)_+(.+)$');
  IF m IS NULL THEN
    INSERT INTO public.alertes_systeme (type, titre, message, details)
    VALUES (
      'exam_result_missing',
      'Format exercice_id inconnu (examen blanc)',
      'Impossible de rattacher la matière terminée pour exercice_id=' || NEW.exercice_id,
      jsonb_build_object(
        'apprenant_id', NEW.apprenant_id,
        'exercice_id', NEW.exercice_id,
        'user_id', NEW.user_id
      )::text
    );
    RETURN NEW;
  END IF;

  v_quiz_id := m[1];
  v_matiere_raw := m[2];

  t := regexp_match(v_matiere_raw, '^(.+?)_+t(\d+)$');
  IF t IS NOT NULL THEN
    v_matiere := t[1];
    v_tentative := GREATEST(1, t[2]::integer);
  ELSE
    v_matiere := v_matiere_raw;
    v_tentative := 1;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.apprenants WHERE id = NEW.apprenant_id) INTO v_apprenant_exists;
  IF NOT v_apprenant_exists THEN
    RETURN NEW;
  END IF;

  -- Additive: an explicit subject-retake receipt binds this copy to ONE exact tentative.
  -- Earlier tentatives are never touched; legacy copies without receipt keep the code below.
  SELECT r.tentative INTO v_retake_tentative FROM public.exam_subject_retakes r
   WHERE r.apprenant_id = NEW.apprenant_id AND r.exercice_id = NEW.exercice_id;
  IF FOUND THEN
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_retake_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = v_retake_tentative;
    IF NOT FOUND THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details)
      VALUES ('exam_result_missing',
        'Matière refaite terminée sans note enregistrée (finalisation en attente)',
        'Les réponses sont conservées pour ' || NEW.exercice_id || ' : aucune autre tentative n''a été modifiée.',
        jsonb_build_object('apprenant_id', NEW.apprenant_id, 'quiz_id', v_quiz_id, 'matiere_id', v_matiere,
          'tentative', v_retake_tentative, 'exercice_id', NEW.exercice_id)::text);
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.apprenant_quiz_results
    WHERE apprenant_id = NEW.apprenant_id
      AND quiz_id = v_quiz_id
      AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
  ) INTO v_exists;

  IF v_exists THEN
    -- Une note existe déjà : on ne touche ni au score, ni aux corrections.
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = (
         SELECT MAX(tentative) FROM public.apprenant_quiz_results
         WHERE apprenant_id = NEW.apprenant_id
           AND quiz_id = v_quiz_id
           AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       );
    RETURN NEW;
  END IF;

  -- Aucune note écrite : on signale, on ne crée AUCUN résultat à 0.
  INSERT INTO public.alertes_systeme (type, titre, message, details)
  VALUES (
    'exam_result_missing',
    'Matière terminée sans note enregistrée (finalisation en attente)',
    'Les réponses sont conservées pour ' || NEW.exercice_id || ' : la note doit être recalculée, aucun 0 n''a été enregistré.',
    jsonb_build_object(
      'apprenant_id', NEW.apprenant_id,
      'user_id', NEW.user_id,
      'quiz_id', v_quiz_id,
      'matiere_id', v_matiere,
      'tentative', v_tentative,
      'exercice_id', NEW.exercice_id,
      'raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
    )::text
  );

  RETURN NEW;
END;
$function$;
CREATE TRIGGER trg_ensure_quiz_result_on_matiere_completion AFTER INSERT OR UPDATE OF completed, reponses ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION ensure_quiz_result_on_matiere_completion();