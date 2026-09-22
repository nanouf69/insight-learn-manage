-- Le journal des corrections est en ecriture seule : le commentaire et
-- l'operation_id doivent etre transmis AU MOMENT de l'insertion de
-- l'evenement, jamais par une mise a jour posterieure.
CREATE OR REPLACE FUNCTION public.core_log_qrc_correction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commentaire text := nullif(current_setting('core.qrc_commentaire', true), '');
  v_operation text := nullif(current_setting('core.qrc_operation_id', true), '');
BEGIN
  IF NEW.etat IS DISTINCT FROM OLD.etat OR NEW.note IS DISTINCT FROM OLD.note THEN
    INSERT INTO public.qrc_correction_events (
      qrc_instance_id, attempt_id, question_id, apprenant_id,
      etat_precedent, etat_nouveau, note_precedente, note_nouvelle,
      commentaire, corrige_par, corrige_email, operation_id
    ) VALUES (
      NEW.qrc_instance_id, NEW.attempt_id, NEW.question_id, NEW.apprenant_id,
      OLD.etat, NEW.etat, OLD.note, NEW.note,
      v_commentaire, NEW.corrige_par, NEW.corrige_email,
      CASE WHEN v_operation IS NULL THEN NULL ELSE v_operation::uuid END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_correct_qrc(
  p_operation_id uuid,
  p_qrc_instance_id uuid,
  p_note numeric,
  p_commentaire text DEFAULT NULL,
  p_corrige_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  inst public.qrc_instances_v2%ROWTYPE;
  resultat jsonb;
BEGIN
  rejeu := public.core_operation_replay(p_operation_id, 'qrc_correction');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QRC_INTROUVABLE: QRC % inexistante.', p_qrc_instance_id USING ERRCODE = 'P0476';
  END IF;

  IF inst.etat = 'corrigee' THEN
    RAISE EXCEPTION 'QRC_DEJA_CORRIGEE: la QRC % est deja corrigee (correction definitive).', p_qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  PERFORM set_config('core.qrc_commentaire', coalesce(p_commentaire, ''), true);
  PERFORM set_config('core.qrc_operation_id', p_operation_id::text, true);

  UPDATE public.qrc_instances_v2
  SET etat = 'corrigee', note = p_note, corrige_par = auth.uid(), corrige_email = p_corrige_email, corrige_at = now()
  WHERE qrc_instance_id = p_qrc_instance_id
  RETURNING * INTO inst;

  PERFORM set_config('core.qrc_commentaire', '', true);
  PERFORM set_config('core.qrc_operation_id', '', true);

  resultat := jsonb_build_object('qrc_instance_id', p_qrc_instance_id, 'etat', inst.etat, 'note', inst.note);

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'qrc_correction', inst.apprenant_id, inst.attempt_id, auth.uid(),
          jsonb_build_object('qrc_instance_id', p_qrc_instance_id), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, attempt_id, apprenant_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('qrc_correction', 'qrc_instances_v2', p_qrc_instance_id::text, inst.attempt_id, inst.apprenant_id, auth.uid(), p_corrige_email,
          jsonb_build_object('etat', 'en_attente'), resultat, 'core_correct_qrc');

  RETURN resultat;
END;
$$;