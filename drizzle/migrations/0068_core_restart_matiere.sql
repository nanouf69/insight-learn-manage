CREATE OR REPLACE FUNCTION public.core_restart_matiere(
  p_operation_id text,
  p_attempt_id uuid,
  p_motif text DEFAULT 'synchronisation_impossible'
) RETURNS public.exam_attempts_v2
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rejeu jsonb;
  v_old public.exam_attempts_v2;
  v_new public.exam_attempts_v2;
  v_res public.core_exam_results;
  v_res_found boolean := false;
BEGIN
  SELECT * INTO v_old FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inconnue.', p_attempt_id USING ERRCODE = 'P0477';
  END IF;

  IF NOT (public.core_est_proprietaire(v_old.apprenant_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'TENTATIVE_REFUSEE: cette tentative appartient a un autre apprenant.' USING ERRCODE = 'P0484';
  END IF;

  rejeu := public.core_operation_replay(p_operation_id, 'attempt_restart');
  IF rejeu IS NOT NULL THEN
    SELECT * INTO v_new FROM public.exam_attempts_v2
     WHERE attempt_id = (rejeu #>> '{resultat,attempt_id}')::uuid;
    RETURN v_new;
  END IF;

  SELECT * INTO v_res FROM public.core_exam_results WHERE attempt_id = p_attempt_id;
  v_res_found := FOUND;
  IF v_res_found AND v_res.status = 'definitif' THEN
    RAISE EXCEPTION 'RESULTAT_DEFINITIF: cette matiere possede deja un resultat definitif.' USING ERRCODE = 'P0490';
  END IF;

  INSERT INTO public.core_tentatives_neutralisees
    (attempt_id, apprenant_id, exam_id, motif, resultat_avant, neutralise_par)
  VALUES
    (p_attempt_id, v_old.apprenant_id, v_old.exam_id,
     coalesce(p_motif, 'synchronisation_impossible'),
     CASE WHEN v_res_found THEN to_jsonb(v_res) ELSE NULL END,
     coalesce(auth.uid()::text, 'apprenant'))
  ON CONFLICT (attempt_id) DO NOTHING;

  IF v_old.etat = 'en_cours' THEN
    UPDATE public.exam_attempts_v2
       SET etat = 'abandonnee', finished_at = now()
     WHERE attempt_id = p_attempt_id;
  END IF;

  SELECT * INTO v_new FROM public.core_start_attempt(
    'restart:' || p_attempt_id::text || ':' || p_operation_id,
    v_old.apprenant_id,
    v_old.exam_id,
    v_old.snapshot->>'matiere'
  );

  IF v_new.attempt_id IS NULL OR v_new.attempt_id = p_attempt_id THEN
    RAISE EXCEPTION 'REPRISE_IMPOSSIBLE: aucune nouvelle tentative ouverte.' USING ERRCODE = 'P0491';
  END IF;

  INSERT INTO public.core_operations
    (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES
    (p_operation_id, 'attempt_restart', v_old.apprenant_id, v_new.attempt_id, auth.uid(),
     jsonb_build_object('ancienne_tentative', p_attempt_id, 'motif', p_motif,
                        'matiere', v_old.snapshot->>'matiere'),
     jsonb_build_object('attempt_id', v_new.attempt_id));

  INSERT INTO public.audit_journal
    (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, avant, apres, origine)
  VALUES
    ('attempt_restart', 'exam_attempts_v2', v_new.attempt_id::text, v_old.exam_id, v_old.exam_version_id,
     v_new.attempt_id, v_old.apprenant_id, auth.uid(),
     jsonb_build_object('ancienne_tentative', p_attempt_id, 'etat_avant', v_old.etat),
     jsonb_build_object('motif', p_motif, 'matiere', v_old.snapshot->>'matiere'),
     'core_restart_matiere');

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.core_restart_matiere(text, uuid, text) TO authenticated;