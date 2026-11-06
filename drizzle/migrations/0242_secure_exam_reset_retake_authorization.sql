ALTER TABLE public.exam_retake_authorizations
  ADD COLUMN reset_id uuid;

ALTER TABLE public.exam_retake_authorizations
  ADD CONSTRAINT exam_retake_authorizations_reset_fk
  FOREIGN KEY (reset_id) REFERENCES public.core_exam_resets(reset_id);

CREATE UNIQUE INDEX exam_retake_authorizations_reset_unique
  ON public.exam_retake_authorizations(reset_id)
  WHERE reset_id IS NOT NULL;

COMMENT ON COLUMN public.exam_retake_authorizations.reset_id IS 'Lien explicite vers la remise a zero administrative ; NULL pour les autorisations historiques ou independantes.';

CREATE OR REPLACE FUNCTION public.core_admin_reset_exam(
  p_operation_id uuid,
  p_apprenant_id uuid,
  p_exam_id text,
  p_motif text,
  p_admin_email text DEFAULT NULL
) RETURNS public.core_exam_resets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.core_exam_resets;
  v_reset public.core_exam_resets;
  v_attempt_ids jsonb;
  v_core_result_ids jsonb;
  v_legacy_result_ids jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'RESET_EXAM_REFUSE: action reservee a un administrateur.' USING ERRCODE = 'P0481';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.apprenants WHERE id = p_apprenant_id) THEN
    RAISE EXCEPTION 'APPRENANT_INTROUVABLE: apprenant % inconnu.', p_apprenant_id USING ERRCODE = 'P0477';
  END IF;

  -- Le reset et les demarrages V2 du meme examen sont serialises. Aucune
  -- tentative ne peut apparaitre entre l'inventaire archive et la coupure.
  PERFORM pg_advisory_xact_lock(hashtextextended('exam-v2:' || p_apprenant_id::text || ':' || p_exam_id, 0));

  SELECT * INTO v_existing
  FROM public.core_exam_resets
  WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.apprenant_id <> p_apprenant_id OR v_existing.exam_id <> p_exam_id THEN
      RAISE EXCEPTION 'OPERATION_CIBLE_DIFFERENTE: cette operation appartient a un autre examen.' USING ERRCODE = 'P0482';
    END IF;
    RETURN v_existing;
  END IF;

  SELECT coalesce(jsonb_agg(ea.attempt_id ORDER BY ea.started_at), '[]'::jsonb)
  INTO v_attempt_ids
  FROM public.exam_attempts_v2 ea
  WHERE ea.apprenant_id = p_apprenant_id
    AND ea.exam_id = p_exam_id;

  SELECT coalesce(jsonb_agg(cr.result_id ORDER BY cr.updated_at), '[]'::jsonb)
  INTO v_core_result_ids
  FROM public.core_exam_results cr
  JOIN public.exam_attempts_v2 ea ON ea.attempt_id = cr.attempt_id
  WHERE ea.apprenant_id = p_apprenant_id
    AND ea.exam_id = p_exam_id;

  SELECT coalesce(jsonb_agg(aqr.id ORDER BY aqr.created_at), '[]'::jsonb)
  INTO v_legacy_result_ids
  FROM public.apprenant_quiz_results aqr
  WHERE aqr.apprenant_id = p_apprenant_id
    AND aqr.quiz_id = p_exam_id
    AND aqr.quiz_type = 'examen_blanc';

  INSERT INTO public.core_exam_resets (
    operation_id, apprenant_id, exam_id, archived_attempt_ids,
    archived_core_result_ids, archived_legacy_result_ids, motif,
    created_by, created_email
  ) VALUES (
    p_operation_id, p_apprenant_id, p_exam_id, v_attempt_ids,
    v_core_result_ids, v_legacy_result_ids,
    coalesce(nullif(trim(p_motif), ''), 'Remise a zero administrative de examen'),
    auth.uid(), p_admin_email
  )
  RETURNING * INTO v_reset;

  INSERT INTO public.core_tentatives_neutralisees
    (attempt_id, apprenant_id, exam_id, motif, resultat_avant, neutralise_par)
  SELECT ea.attempt_id, ea.apprenant_id, ea.exam_id,
         'Archive par remise a zero administrative ' || v_reset.reset_id::text,
         CASE WHEN cr.result_id IS NULL THEN NULL ELSE to_jsonb(cr) END,
         coalesce(p_admin_email, auth.uid()::text, 'admin')
  FROM public.exam_attempts_v2 ea
  LEFT JOIN public.core_exam_results cr ON cr.attempt_id = ea.attempt_id
  WHERE ea.apprenant_id = p_apprenant_id
    AND ea.exam_id = p_exam_id
  ON CONFLICT (attempt_id) DO NOTHING;

  UPDATE public.exam_attempts_v2
  SET etat = 'abandonnee', finished_at = v_reset.cutoff_at
  WHERE apprenant_id = p_apprenant_id
    AND exam_id = p_exam_id
    AND etat = 'en_cours';

  INSERT INTO public.exam_retake_authorizations (
    apprenant_id, exam_id, motif, result_ids, granted_by, granted_email, reset_id
  ) VALUES (
    p_apprenant_id, p_exam_id,
    'Remise a zero administrative complete ' || v_reset.reset_id::text,
    v_legacy_result_ids, auth.uid(), p_admin_email, v_reset.reset_id
  );

  INSERT INTO public.audit_journal (
    operation, cible_type, cible_id, exam_id, apprenant_id, auteur, avant, apres, origine
  ) VALUES (
    'exam_admin_reset', 'core_exam_resets', v_reset.reset_id::text,
    p_exam_id, p_apprenant_id, auth.uid(),
    jsonb_build_object(
      'attempt_ids', v_attempt_ids,
      'core_result_ids', v_core_result_ids,
      'legacy_result_ids', v_legacy_result_ids
    ),
    jsonb_build_object('cutoff_at', v_reset.cutoff_at, 'progression', 0, 'premiere_matiere', 'non_commencee'),
    'core_admin_reset_exam'
  );

  RETURN v_reset;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_start_attempt(
  p_operation_id uuid,
  p_apprenant_id uuid,
  p_exam_id text,
  p_matiere text,
  p_is_test boolean DEFAULT false
)
RETURNS public.exam_attempts_v2
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  v_test boolean;
  v_version public.exam_content_versions;
  v_questions jsonb;
  v_matieres jsonb;
  v_snapshot jsonb;
  v_att public.exam_attempts_v2;
  v_reset_authorization uuid;
  v_fallback_count integer;
BEGIN
  v_test := public.core_bridge_compte_test(p_apprenant_id);

  IF NOT public.core_bridge_actif(v_test) THEN
    RAISE EXCEPTION 'PONT_V2_INACTIF: le raccordement des passages au noyau n''est pas active (test=%).', v_test
      USING ERRCODE = 'P0483';
  END IF;

  IF NOT (public.core_est_proprietaire(p_apprenant_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'TENTATIVE_REFUSEE: impossible de demarrer la tentative d''un autre apprenant.'
      USING ERRCODE = 'P0484';
  END IF;

  -- Meme verrou que le reset, porte examen entier : deux tablettes et deux
  -- matieres ne peuvent pas consommer deux fois la meme autorisation.
  PERFORM pg_advisory_xact_lock(hashtextextended('exam-v2:' || p_apprenant_id::text || ':' || p_exam_id, 0));

  rejeu := public.core_operation_replay(p_operation_id, 'attempt_start');
  IF rejeu IS NOT NULL THEN
    SELECT * INTO v_att FROM public.exam_attempts_v2 WHERE attempt_id = (rejeu #>> '{resultat,attempt_id}')::uuid;
    IF NOT FOUND OR v_att.apprenant_id <> p_apprenant_id OR v_att.exam_id <> p_exam_id
       OR v_att.snapshot->>'matiere' <> p_matiere THEN
      RAISE EXCEPTION 'OPERATION_CIBLE_DIFFERENTE: cette operation appartient a une autre tentative.' USING ERRCODE = 'P0482';
    END IF;
    RETURN v_att;
  END IF;

  SELECT * INTO v_att FROM public.exam_attempts_v2
    WHERE apprenant_id = p_apprenant_id
     AND exam_id = p_exam_id
     AND etat = 'en_cours'
     AND snapshot->>'matiere' = p_matiere
   ORDER BY started_at DESC LIMIT 1;
  IF FOUND THEN
    -- Meme une reprise recoit un recu d'operation : un double appareil ne
    -- pourra pas reutiliser cette operation pour creer un passage apres cloture.
    INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
    VALUES (p_operation_id, 'attempt_start', p_apprenant_id, v_att.attempt_id, auth.uid(),
            jsonb_build_object('exam_id', p_exam_id, 'matiere', p_matiere),
            jsonb_build_object('attempt_id', v_att.attempt_id, 'snapshot_fingerprint', v_att.snapshot_fingerprint));
    RETURN v_att;
  END IF;

  SELECT * INTO v_version FROM public.exam_content_versions
    WHERE exam_id = p_exam_id AND statut = 'publiee' AND retired_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_ABSENTE: aucune version publiee pour l''examen %.', p_exam_id USING ERRCODE = 'P0485';
  END IF;

  SELECT jsonb_agg(q ORDER BY ord) INTO v_questions
    FROM (
      SELECT value AS q, ordinality AS ord
        FROM jsonb_array_elements(v_version.content->'questions') WITH ORDINALITY AS t(value, ordinality)
       WHERE value->>'matiere' = p_matiere
    ) s;

  IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
    RAISE EXCEPTION 'MATIERE_ABSENTE: la matiere % ne figure pas dans la version publiee de %.', p_matiere, p_exam_id
      USING ERRCODE = 'P0487';
  END IF;

  SELECT jsonb_agg(m) INTO v_matieres
    FROM jsonb_array_elements(coalesce(v_version.content->'matieres', '[]'::jsonb)) m
   WHERE m->>'subject_id' = p_matiere;

  v_snapshot := jsonb_build_object(
    'exam_id', p_exam_id,
    'exam_libelle', v_version.content->>'exam_libelle',
    'filiere', v_version.filiere,
    'exam_numero', v_version.exam_numero,
    'matiere', p_matiere,
    'matieres', coalesce(v_matieres, '[]'::jsonb),
    'questions', v_questions
  );

  -- Lien structure pour les nouveaux resets. Aucun rattachement ni backfill
  -- historique : seule la consommation de l'autorisation est horodatee.
  SELECT a.id INTO v_reset_authorization
  FROM public.exam_retake_authorizations a
  JOIN public.core_exam_resets r ON r.reset_id = a.reset_id
  WHERE a.apprenant_id = p_apprenant_id
    AND a.exam_id = p_exam_id
    AND a.consumed_at IS NULL
    AND a.revoked_at IS NULL
    AND r.cutoff_at <= clock_timestamp()
  ORDER BY r.cutoff_at DESC
  LIMIT 1
  FOR UPDATE OF a;

  IF v_reset_authorization IS NULL THEN
    -- Compatibilite des resets deja enregistres avant reset_id : egalite
    -- exacte produite par la meme transaction, acceptee seulement si unique.
    SELECT count(*) INTO v_fallback_count
    FROM public.exam_retake_authorizations a
    JOIN public.core_exam_resets r
      ON r.apprenant_id = a.apprenant_id AND r.exam_id = a.exam_id AND r.cutoff_at = a.created_at
    WHERE a.apprenant_id = p_apprenant_id
      AND a.exam_id = p_exam_id
      AND a.reset_id IS NULL
      AND a.consumed_at IS NULL
      AND a.revoked_at IS NULL
      AND r.cutoff_at <= clock_timestamp();

    IF v_fallback_count = 1 THEN
      SELECT a.id INTO v_reset_authorization
      FROM public.exam_retake_authorizations a
      JOIN public.core_exam_resets r
        ON r.apprenant_id = a.apprenant_id AND r.exam_id = a.exam_id AND r.cutoff_at = a.created_at
      WHERE a.apprenant_id = p_apprenant_id
        AND a.exam_id = p_exam_id
        AND a.reset_id IS NULL
        AND a.consumed_at IS NULL
        AND a.revoked_at IS NULL
        AND r.cutoff_at <= clock_timestamp()
      LIMIT 1
      FOR UPDATE OF a;
    END IF;
  END IF;

  INSERT INTO public.exam_attempts_v2
    (apprenant_id, exam_id, exam_version_id, snapshot, snapshot_fingerprint, etat, is_test)
  VALUES
    (p_apprenant_id, p_exam_id, v_version.id, v_snapshot, md5(v_snapshot::text), 'en_cours', v_test)
  RETURNING * INTO v_att;

  IF v_reset_authorization IS NOT NULL THEN
    UPDATE public.exam_retake_authorizations
    SET consumed_at = clock_timestamp()
    WHERE id = v_reset_authorization
      AND consumed_at IS NULL
      AND revoked_at IS NULL;
  END IF;

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'attempt_start', p_apprenant_id, v_att.attempt_id, auth.uid(),
          jsonb_build_object('exam_id', p_exam_id, 'matiere', p_matiere),
          jsonb_build_object('attempt_id', v_att.attempt_id, 'snapshot_fingerprint', v_att.snapshot_fingerprint));

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('attempt_start', 'exam_attempts_v2', v_att.attempt_id::text, p_exam_id, v_version.id, v_att.attempt_id,
          p_apprenant_id, auth.uid(),
          jsonb_build_object('matiere', p_matiere, 'snapshot_fingerprint', v_att.snapshot_fingerprint, 'is_test', v_test),
          'core_start_attempt');

  RETURN v_att;
END;
$$;