CREATE TABLE public.core_exam_resets (
  reset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL UNIQUE,
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  cutoff_at timestamptz NOT NULL DEFAULT now(),
  archived_attempt_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_core_result_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_legacy_result_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  motif text NOT NULL,
  created_by uuid,
  created_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.core_exam_resets TO authenticated;
GRANT ALL ON public.core_exam_resets TO service_role;

ALTER TABLE public.core_exam_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apprenant ou admin lit ses remises a zero"
ON public.core_exam_resets
FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.core_exam_reset_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'EXAM_RESET_APPEND_ONLY: journal inalterable (%).', OLD.reset_id
    USING ERRCODE = 'P0492';
END;
$$;

CREATE TRIGGER trg_core_exam_reset_append_only
BEFORE UPDATE OR DELETE ON public.core_exam_resets
FOR EACH ROW EXECUTE FUNCTION public.core_exam_reset_append_only();

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

  SELECT * INTO v_existing
  FROM public.core_exam_resets
  WHERE operation_id = p_operation_id;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.apprenants WHERE id = p_apprenant_id) THEN
    RAISE EXCEPTION 'APPRENANT_INTROUVABLE: apprenant % inconnu.', p_apprenant_id USING ERRCODE = 'P0477';
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
    apprenant_id, exam_id, motif, result_ids, granted_by, granted_email
  ) VALUES (
    p_apprenant_id, p_exam_id,
    'Remise a zero administrative complete ' || v_reset.reset_id::text,
    v_legacy_result_ids, auth.uid(), p_admin_email
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

GRANT EXECUTE ON FUNCTION public.core_admin_reset_exam(uuid, uuid, text, text, text) TO authenticated;

COMMENT ON TABLE public.core_exam_resets IS 'Journal append-only des remises a zero administratives : les anciennes donnees restent intactes et sont exclues seulement du nouveau passage.';
COMMENT ON FUNCTION public.core_admin_reset_exam(uuid, uuid, text, text, text) IS 'Archive logiquement un examen complet, abandonne ses seules tentatives V2 ouvertes et autorise un nouveau passage sans copier de reponses.';