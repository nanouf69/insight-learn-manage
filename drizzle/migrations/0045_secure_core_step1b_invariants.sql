-- ============================================================
-- Noyau sécurisé — étape 1b : invariants serveur manquants
-- Portée : UNIQUEMENT les tables du nouveau noyau (vides).
-- Aucune donnée existante n'est lue, copiée ni modifiée.
-- ============================================================

-- ---------- Journal d'opérations idempotentes ----------
CREATE TABLE public.core_operations (
  operation_id uuid PRIMARY KEY,
  operation_type text NOT NULL,
  apprenant_id uuid,
  attempt_id uuid,
  auteur uuid,
  cible jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultat jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.core_operations TO authenticated;
GRANT ALL ON public.core_operations TO service_role;
ALTER TABLE public.core_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "core_operations lecture authentifiee" ON public.core_operations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "core_operations service_role" ON public.core_operations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_core_operations_append_only
  BEFORE UPDATE OR DELETE ON public.core_operations
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();

-- ---------- Journal des corrections QRC (domaine séparé) ----------
CREATE TABLE public.qrc_correction_events (
  correction_event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  qrc_instance_id uuid NOT NULL REFERENCES public.qrc_instances_v2(qrc_instance_id),
  attempt_id uuid NOT NULL,
  question_id text NOT NULL,
  apprenant_id uuid NOT NULL,
  etat_precedent text,
  etat_nouveau text NOT NULL,
  note_precedente numeric,
  note_nouvelle numeric,
  commentaire text,
  corrige_par uuid,
  corrige_email text,
  operation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.qrc_correction_events TO authenticated;
GRANT ALL ON public.qrc_correction_events TO service_role;
ALTER TABLE public.qrc_correction_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qrc_correction_events lecture authentifiee" ON public.qrc_correction_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qrc_correction_events service_role" ON public.qrc_correction_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_qrc_correction_events_append_only
  BEFORE UPDATE OR DELETE ON public.qrc_correction_events
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();

-- ---------- Lecture des identifiants de question d'un snapshot ----------
CREATE OR REPLACE FUNCTION public.core_snapshot_question_ids(p_node jsonb)
RETURNS SETOF text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  k text;
  v jsonb;
BEGIN
  IF p_node IS NULL THEN
    RETURN;
  END IF;

  IF jsonb_typeof(p_node) = 'array' THEN
    FOR v IN SELECT value FROM jsonb_array_elements(p_node) LOOP
      RETURN QUERY SELECT * FROM public.core_snapshot_question_ids(v);
    END LOOP;
  ELSIF jsonb_typeof(p_node) = 'object' THEN
    FOR k, v IN SELECT key, value FROM jsonb_each(p_node) LOOP
      IF k IN ('id', 'question_id', 'questionId') AND jsonb_typeof(v) IN ('string', 'number') THEN
        RETURN NEXT (v #>> '{}');
      ELSE
        RETURN QUERY SELECT * FROM public.core_snapshot_question_ids(v);
      END IF;
    END LOOP;
  END IF;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_snapshot_has_question(p_snapshot jsonb, p_question_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.core_snapshot_question_ids(p_snapshot) AS qid
    WHERE qid = p_question_id
  );
$$;

-- ---------- 1+2+3 : contexte obligatoire d'une réponse ----------
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

CREATE TRIGGER trg_answer_state_context
  BEFORE INSERT OR UPDATE ON public.answer_state
  FOR EACH ROW EXECUTE FUNCTION public.core_enforce_answer_context();

-- ---------- 1+2+3 : contexte obligatoire d'une QRC ----------
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

CREATE TRIGGER trg_qrc_v2_context
  BEFORE INSERT OR UPDATE ON public.qrc_instances_v2
  FOR EACH ROW EXECUTE FUNCTION public.core_enforce_qrc_context();

-- ---------- Correction QRC = evenement trace, jamais une reecriture ----------
CREATE OR REPLACE FUNCTION public.core_log_qrc_correction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.etat IS DISTINCT FROM OLD.etat OR NEW.note IS DISTINCT FROM OLD.note THEN
    INSERT INTO public.qrc_correction_events (
      qrc_instance_id, attempt_id, question_id, apprenant_id,
      etat_precedent, etat_nouveau, note_precedente, note_nouvelle,
      corrige_par, corrige_email
    ) VALUES (
      NEW.qrc_instance_id, NEW.attempt_id, NEW.question_id, NEW.apprenant_id,
      OLD.etat, NEW.etat, OLD.note, NEW.note,
      NEW.corrige_par, NEW.corrige_email
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qrc_v2_correction_journal
  AFTER UPDATE ON public.qrc_instances_v2
  FOR EACH ROW EXECUTE FUNCTION public.core_log_qrc_correction();

-- ---------- 4 : jamais 0 ni 2 versions actives ----------
CREATE OR REPLACE FUNCTION public.core_enforce_single_active_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  nb_actives integer;
  a_deja_publie boolean;
BEGIN
  SELECT count(*) INTO nb_actives
  FROM public.exam_content_versions
  WHERE exam_id = NEW.exam_id AND statut = 'publiee' AND retired_at IS NULL;

  IF nb_actives > 1 THEN
    RAISE EXCEPTION 'EXAM_VERSION_ACTIVE_UNIQUE: % versions actives pour l''examen % (une seule autorisee).',
      nb_actives, NEW.exam_id
      USING ERRCODE = 'P0481';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.exam_content_versions
    WHERE exam_id = NEW.exam_id AND published_at IS NOT NULL
  ) INTO a_deja_publie;

  IF nb_actives = 0 AND a_deja_publie THEN
    RAISE EXCEPTION 'EXAM_VERSION_ACTIVE_MANQUANTE: l''examen % se retrouverait sans version active.', NEW.exam_id
      USING ERRCODE = 'P0481';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_exam_version_exactly_one_active
  AFTER INSERT OR UPDATE ON public.exam_content_versions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.core_enforce_single_active_version();

-- ---------- Idempotence : rejeu d'une operation deja executee ----------
CREATE OR REPLACE FUNCTION public.core_operation_replay(p_operation_id uuid, p_operation_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existante public.core_operations%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'OPERATION_ID_OBLIGATOIRE: toute ecriture doit porter un operation_id unique.'
      USING ERRCODE = 'P0482';
  END IF;

  SELECT * INTO existante FROM public.core_operations WHERE operation_id = p_operation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF existante.operation_type <> p_operation_type THEN
    RAISE EXCEPTION 'OPERATION_ID_REUTILISE: operation_id % deja utilise pour une operation de type %.',
      p_operation_id, existante.operation_type
      USING ERRCODE = 'P0482';
  END IF;

  RETURN jsonb_build_object('rejeu', true, 'resultat', existante.resultat);
END;
$$;

-- ---------- Ecriture d'une reponse (idempotente + revision) ----------
CREATE OR REPLACE FUNCTION public.core_save_answer(
  p_operation_id uuid,
  p_attempt_id uuid,
  p_question_id text,
  p_valeur jsonb,
  p_expected_revision integer,
  p_session_origine text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  att public.exam_attempts_v2%ROWTYPE;
  courant public.answer_state%ROWTYPE;
  resultat jsonb;
BEGIN
  rejeu := public.core_operation_replay(p_operation_id, 'answer_save');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', p_attempt_id USING ERRCODE = 'P0477';
  END IF;

  SELECT * INTO courant FROM public.answer_state
  WHERE attempt_id = p_attempt_id AND question_id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    IF coalesce(p_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'ANSWER_STALE_REVISION: revision attendue % alors qu''aucune reponse n''existe.', p_expected_revision
        USING ERRCODE = 'P0409';
    END IF;

    INSERT INTO public.answer_state (attempt_id, apprenant_id, question_id, valeur, revision, updated_by, session_origine)
    VALUES (p_attempt_id, att.apprenant_id, p_question_id, p_valeur, 1, auth.uid(), p_session_origine)
    RETURNING * INTO courant;
  ELSE
    IF p_expected_revision IS DISTINCT FROM courant.revision THEN
      RAISE EXCEPTION 'ANSWER_STALE_REVISION: revision % obsolete (serveur = %).', p_expected_revision, courant.revision
        USING ERRCODE = 'P0409';
    END IF;

    UPDATE public.answer_state
    SET valeur = p_valeur,
        revision = courant.revision + 1,
        updated_by = auth.uid(),
        session_origine = p_session_origine
    WHERE response_id = courant.response_id
    RETURNING * INTO courant;
  END IF;

  resultat := jsonb_build_object(
    'response_id', courant.response_id,
    'attempt_id', courant.attempt_id,
    'question_id', courant.question_id,
    'revision', courant.revision
  );

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'answer_save', att.apprenant_id, p_attempt_id, auth.uid(),
          jsonb_build_object('question_id', p_question_id), resultat);

  RETURN resultat;
END;
$$;

-- ---------- Finalisation atomique d'une tentative ----------
CREATE OR REPLACE FUNCTION public.core_finalize_attempt(
  p_operation_id uuid,
  p_attempt_id uuid,
  p_qrc_questions text[] DEFAULT '{}'::text[],
  p_resultat jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  att public.exam_attempts_v2%ROWTYPE;
  qid text;
  nb_qrc integer := 0;
  resultat jsonb;
BEGIN
  rejeu := public.core_operation_replay(p_operation_id, 'attempt_finalize');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', p_attempt_id USING ERRCODE = 'P0477';
  END IF;

  IF att.etat <> 'en_cours' THEN
    RAISE EXCEPTION 'ATTEMPT_CLOSED: la tentative % est deja %.', p_attempt_id, att.etat USING ERRCODE = 'P0478';
  END IF;

  FOREACH qid IN ARRAY coalesce(p_qrc_questions, '{}'::text[]) LOOP
    INSERT INTO public.qrc_instances_v2 (attempt_id, question_id, apprenant_id, reponse, etat)
    SELECT p_attempt_id, qid, att.apprenant_id, s.valeur, 'en_attente'
    FROM (SELECT valeur FROM public.answer_state WHERE attempt_id = p_attempt_id AND question_id = qid) s
    ON CONFLICT (attempt_id, question_id) DO NOTHING;
    nb_qrc := nb_qrc + 1;
  END LOOP;

  UPDATE public.exam_attempts_v2
  SET etat = 'terminee', finished_at = now()
  WHERE attempt_id = p_attempt_id;

  resultat := jsonb_build_object('attempt_id', p_attempt_id, 'etat', 'terminee', 'qrc_creees', nb_qrc, 'resultat', p_resultat);

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'attempt_finalize', att.apprenant_id, p_attempt_id, auth.uid(),
          jsonb_build_object('qrc_questions', to_jsonb(p_qrc_questions)), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('attempt_finalize', 'exam_attempts_v2', p_attempt_id::text, att.exam_id, att.exam_version_id, p_attempt_id, att.apprenant_id, auth.uid(), resultat, 'core_finalize_attempt');

  RETURN resultat;
END;
$$;

-- ---------- Correction QRC (domaine separe, idempotente, finale) ----------
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

  UPDATE public.qrc_instances_v2
  SET etat = 'corrigee', note = p_note, corrige_par = auth.uid(), corrige_email = p_corrige_email, corrige_at = now()
  WHERE qrc_instance_id = p_qrc_instance_id
  RETURNING * INTO inst;

  UPDATE public.qrc_correction_events
  SET commentaire = p_commentaire, operation_id = p_operation_id
  WHERE correction_event_id = (
    SELECT max(correction_event_id) FROM public.qrc_correction_events WHERE qrc_instance_id = p_qrc_instance_id
  );

  resultat := jsonb_build_object('qrc_instance_id', p_qrc_instance_id, 'etat', inst.etat, 'note', inst.note);

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'qrc_correction', inst.apprenant_id, inst.attempt_id, auth.uid(),
          jsonb_build_object('qrc_instance_id', p_qrc_instance_id), resultat);

  RETURN resultat;
END;
$$;

-- ---------- Publication atomique d'une version ----------
CREATE OR REPLACE FUNCTION public.core_publish_exam_version(
  p_operation_id uuid,
  p_version_id uuid,
  p_published_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  v public.exam_content_versions%ROWTYPE;
  ancienne uuid;
  resultat jsonb;
BEGIN
  rejeu := public.core_operation_replay(p_operation_id, 'exam_publish');
  IF rejeu IS NOT NULL THEN
    RETURN rejeu #> '{resultat}';
  END IF;

  SELECT * INTO v FROM public.exam_content_versions WHERE id = p_version_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_INTROUVABLE: version % inexistante.', p_version_id USING ERRCODE = 'P0472';
  END IF;

  -- serialise les publications concurrentes du meme examen
  PERFORM pg_advisory_xact_lock(hashtext('exam_publish:' || v.exam_id));

  SELECT * INTO v FROM public.exam_content_versions WHERE id = p_version_id FOR UPDATE;

  IF v.statut <> 'brouillon' THEN
    RAISE EXCEPTION 'PUBLICATION_INVALIDE: seule une version brouillon peut etre publiee (version % = %).', p_version_id, v.statut
      USING ERRCODE = 'P0472';
  END IF;

  SELECT id INTO ancienne
  FROM public.exam_content_versions
  WHERE exam_id = v.exam_id AND statut = 'publiee' AND retired_at IS NULL
  FOR UPDATE;

  IF ancienne IS NOT NULL THEN
    UPDATE public.exam_content_versions
    SET statut = 'retiree', retired_at = now()
    WHERE id = ancienne;
  END IF;

  UPDATE public.exam_content_versions
  SET statut = 'publiee', published_at = now(), published_by = auth.uid(), published_email = p_published_email
  WHERE id = p_version_id
  RETURNING * INTO v;

  resultat := jsonb_build_object(
    'exam_id', v.exam_id,
    'version_id', v.id,
    'version_number', v.version_number,
    'fingerprint', v.fingerprint,
    'version_retiree', ancienne
  );

  INSERT INTO public.core_operations (operation_id, operation_type, auteur, cible, resultat)
  VALUES (p_operation_id, 'exam_publish', auth.uid(), jsonb_build_object('version_id', p_version_id), resultat);

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('exam_publish', 'exam_content_versions', p_version_id::text, v.exam_id, v.id, auth.uid(), p_published_email,
          jsonb_build_object('version_active_precedente', ancienne), resultat, 'core_publish_exam_version');

  RETURN resultat;
END;
$$;

COMMENT ON TABLE public.core_operations IS 'Idempotence : un operation_id unique par ecriture importante ; un rejeu renvoie le resultat de la premiere operation.';
COMMENT ON TABLE public.qrc_correction_events IS 'Correction formateur = evenement trace et separe ; la reponse originale de l''eleve n''est jamais reecrite.';