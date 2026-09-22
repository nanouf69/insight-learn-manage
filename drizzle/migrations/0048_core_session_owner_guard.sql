-- Noyau sécurisé : la session authentifiée d'un apprenant ne peut écrire
-- que dans SES propres tentatives. Portée : tables du nouveau noyau uniquement.
-- Aucune donnée existante n'est lue, copiée ni modifiée.

CREATE OR REPLACE FUNCTION public.core_assert_session_owner(p_apprenant_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  mine uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN; -- contexte serveur / service_role : autres invariants applicables
  END IF;

  SELECT a.id INTO mine FROM public.apprenants a WHERE a.auth_user_id = uid LIMIT 1;

  IF mine IS NULL THEN
    RETURN; -- session non apprenante (formateur / admin) : domaine correction
  END IF;

  IF mine IS DISTINCT FROM p_apprenant_id THEN
    RAISE EXCEPTION 'SESSION_NON_AUTORISEE: la session authentifiee (apprenant %) n''est pas autorisee pour la tentative de l''apprenant %.',
      mine, p_apprenant_id
      USING ERRCODE = 'P0477';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_enforce_answer_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  att public.exam_attempts_v2%ROWTYPE;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = NEW.attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', NEW.attempt_id
      USING ERRCODE = 'P0477';
  END IF;

  IF NEW.apprenant_id IS DISTINCT FROM att.apprenant_id THEN
    RAISE EXCEPTION 'ANSWER_OWNERSHIP: la reponse (apprenant %) n''appartient pas au proprietaire de la tentative (apprenant %).',
      NEW.apprenant_id, att.apprenant_id
      USING ERRCODE = 'P0477';
  END IF;

  PERFORM public.core_assert_session_owner(att.apprenant_id);

  IF att.etat <> 'en_cours' THEN
    RAISE EXCEPTION 'ATTEMPT_CLOSED: la tentative % est % : aucune reponse ne peut plus etre ecrite.', att.attempt_id, att.etat
      USING ERRCODE = 'P0478';
  END IF;

  IF NOT public.core_snapshot_has_question(att.snapshot, NEW.question_id) THEN
    RAISE EXCEPTION 'QUESTION_HORS_SNAPSHOT: la question % ne fait pas partie du snapshot de la tentative % (examen %).',
      NEW.question_id, att.attempt_id, att.exam_id
      USING ERRCODE = 'P0479';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_enforce_qrc_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  att public.exam_attempts_v2%ROWTYPE;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = NEW.attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', NEW.attempt_id
      USING ERRCODE = 'P0477';
  END IF;

  IF NEW.apprenant_id IS DISTINCT FROM att.apprenant_id THEN
    RAISE EXCEPTION 'QRC_OWNERSHIP: la QRC (apprenant %) n''appartient pas au proprietaire de la tentative (apprenant %).',
      NEW.apprenant_id, att.apprenant_id
      USING ERRCODE = 'P0477';
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.core_assert_session_owner(att.apprenant_id);

    IF att.etat <> 'en_cours' THEN
      RAISE EXCEPTION 'ATTEMPT_CLOSED: la tentative % est % : aucune QRC ne peut plus y etre creee.', att.attempt_id, att.etat
        USING ERRCODE = 'P0478';
    END IF;

    IF NOT public.core_snapshot_has_question(att.snapshot, NEW.question_id) THEN
      RAISE EXCEPTION 'QUESTION_HORS_SNAPSHOT: la question % ne fait pas partie du snapshot de la tentative % (examen %).',
        NEW.question_id, att.attempt_id, att.exam_id
        USING ERRCODE = 'P0479';
    END IF;
  ELSE
    -- Correction formateur autorisee apres la fin de la tentative,
    -- MAIS la reponse originale de l'eleve reste figee.
    IF NEW.reponse IS DISTINCT FROM OLD.reponse THEN
      RAISE EXCEPTION 'QRC_REPONSE_ELEVE_FIGEE: la reponse originale de l''eleve ne peut pas etre modifiee par une correction (%).',
        OLD.qrc_instance_id
        USING ERRCODE = 'P0480';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.core_assert_session_owner(uuid) IS
  'Une session authentifiee d''apprenant ne peut ecrire que dans ses propres tentatives du noyau securise.';