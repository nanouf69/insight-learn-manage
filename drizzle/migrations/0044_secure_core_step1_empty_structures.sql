-- ÉTAPE 1 : structures vides, en parallèle de l'existant.
-- Aucune donnée existante n'est lue, copiée, modifiée ou supprimée ici.

-- =====================================================================
-- B. VERSIONS PUBLIÉES (immuables)
-- =====================================================================
CREATE TABLE public.exam_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filiere TEXT NOT NULL,
  exam_numero TEXT NOT NULL,
  module_id INTEGER,
  exam_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint TEXT NOT NULL DEFAULT '',
  motif TEXT,
  created_by UUID,
  created_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID,
  published_email TEXT,
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  CONSTRAINT exam_content_versions_statut_chk
    CHECK (statut IN ('brouillon','publiee','retiree')),
  CONSTRAINT exam_content_versions_unique_number
    UNIQUE (exam_id, version_number)
);

-- Une seule version ACTIVE (publiée non retirée) par examen.
CREATE UNIQUE INDEX exam_content_versions_one_active
  ON public.exam_content_versions (exam_id)
  WHERE statut = 'publiee' AND retired_at IS NULL;

CREATE INDEX exam_content_versions_identite
  ON public.exam_content_versions (filiere, exam_numero, exam_id);

GRANT SELECT ON public.exam_content_versions TO authenticated;
GRANT INSERT, UPDATE ON public.exam_content_versions TO authenticated;
GRANT ALL ON public.exam_content_versions TO service_role;

ALTER TABLE public.exam_content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des versions par utilisateurs authentifies"
  ON public.exam_content_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin cree des versions"
  ON public.exam_content_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin modifie uniquement les brouillons"
  ON public.exam_content_versions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND statut = 'brouillon')
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Garde-fou serveur : une version publiée est IMMUABLE.
-- Seule transition autorisée : brouillon -> publiee, publiee -> retiree.
CREATE OR REPLACE FUNCTION public.enforce_exam_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: suppression interdite (version %)', OLD.id
      USING ERRCODE = 'P0472';
  END IF;

  IF OLD.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;

  IF OLD.statut = 'publiee' THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint
       OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
       OR NEW.filiere IS DISTINCT FROM OLD.filiere
       OR NEW.exam_numero IS DISTINCT FROM OLD.exam_numero
       OR NEW.version_number IS DISTINCT FROM OLD.version_number THEN
      RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: une version publiee ne peut pas etre reecrite (version %)', OLD.id
        USING ERRCODE = 'P0472';
    END IF;
    IF NEW.statut NOT IN ('publiee','retiree') THEN
      RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: transition de statut interdite'
        USING ERRCODE = 'P0472';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.statut = 'retiree' AND NEW.statut <> 'retiree' THEN
    RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: une version retiree ne peut pas etre reactivee'
      USING ERRCODE = 'P0472';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_exam_version_immutability
  BEFORE UPDATE OR DELETE ON public.exam_content_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_exam_version_immutability();

-- =====================================================================
-- A'. PARTAGE DÉCLARÉ (aucune propagation silencieuse)
-- =====================================================================
CREATE TABLE public.exam_content_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_exam_id TEXT NOT NULL,
  source_matiere TEXT NOT NULL,
  target_exam_id TEXT NOT NULL,
  target_matiere TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  declared_by UUID,
  declared_email TEXT,
  motif TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT exam_content_shares_unique
    UNIQUE (source_exam_id, source_matiere, target_exam_id, target_matiere)
);

GRANT SELECT, INSERT, UPDATE ON public.exam_content_shares TO authenticated;
GRANT ALL ON public.exam_content_shares TO service_role;

ALTER TABLE public.exam_content_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des partages declares"
  ON public.exam_content_shares FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin declare un partage"
  ON public.exam_content_shares FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin revoque un partage"
  ON public.exam_content_shares FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- C. TENTATIVES (attempt_id immuable + version figée + snapshot)
-- =====================================================================
CREATE TABLE public.exam_attempts_v2 (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL,
  exam_id TEXT NOT NULL,
  exam_version_id UUID NOT NULL REFERENCES public.exam_content_versions(id),
  snapshot JSONB NOT NULL,
  snapshot_fingerprint TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  etat TEXT NOT NULL DEFAULT 'en_cours',
  CONSTRAINT exam_attempts_v2_etat_chk
    CHECK (etat IN ('en_cours','terminee','abandonnee'))
);

CREATE INDEX exam_attempts_v2_apprenant ON public.exam_attempts_v2 (apprenant_id, exam_id);

GRANT SELECT, INSERT, UPDATE ON public.exam_attempts_v2 TO authenticated;
GRANT ALL ON public.exam_attempts_v2 TO service_role;

ALTER TABLE public.exam_attempts_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des tentatives authentifiee"
  ON public.exam_attempts_v2 FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creation de tentative authentifiee"
  ON public.exam_attempts_v2 FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Cloture de tentative authentifiee"
  ON public.exam_attempts_v2 FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Une tentative commencée est figée : ni son snapshot, ni sa version, ni son identité.
CREATE OR REPLACE FUNCTION public.enforce_attempt_v2_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ATTEMPT_IMMUTABLE: suppression de tentative interdite (%).', OLD.attempt_id
      USING ERRCODE = 'P0473';
  END IF;

  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id
     OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
     OR NEW.exam_version_id IS DISTINCT FROM OLD.exam_version_id
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.snapshot_fingerprint IS DISTINCT FROM OLD.snapshot_fingerprint
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'ATTEMPT_IMMUTABLE: le contenu d''une tentative commencee ne peut pas etre modifie (%).', OLD.attempt_id
      USING ERRCODE = 'P0473';
  END IF;

  IF OLD.etat = 'terminee' AND NEW.etat <> 'terminee' THEN
    RAISE EXCEPTION 'ATTEMPT_IMMUTABLE: une tentative terminee ne peut pas etre rouverte (%).', OLD.attempt_id
      USING ERRCODE = 'P0473';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attempt_v2_immutability
  BEFORE UPDATE OR DELETE ON public.exam_attempts_v2
  FOR EACH ROW EXECUTE FUNCTION public.enforce_attempt_v2_immutability();

-- =====================================================================
-- D. RÉPONSES : état courant versionné + journal d'événements
-- =====================================================================
CREATE TABLE public.answer_state (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts_v2(attempt_id),
  apprenant_id UUID NOT NULL,
  question_id TEXT NOT NULL,
  valeur JSONB,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  session_origine TEXT,
  CONSTRAINT answer_state_unique_courant UNIQUE (attempt_id, question_id)
);

CREATE INDEX answer_state_apprenant ON public.answer_state (apprenant_id, attempt_id);

GRANT SELECT, INSERT, UPDATE ON public.answer_state TO authenticated;
GRANT ALL ON public.answer_state TO service_role;

ALTER TABLE public.answer_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des reponses authentifiee"
  ON public.answer_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ecriture des reponses authentifiee"
  ON public.answer_state FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Mise a jour des reponses authentifiee"
  ON public.answer_state FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE public.answer_events (
  event_id BIGSERIAL PRIMARY KEY,
  response_id UUID NOT NULL,
  attempt_id UUID NOT NULL,
  apprenant_id UUID NOT NULL,
  question_id TEXT NOT NULL,
  valeur_precedente JSONB,
  valeur_nouvelle JSONB,
  revision_precedente INTEGER,
  revision_nouvelle INTEGER NOT NULL,
  origine TEXT,
  session_origine TEXT,
  auteur UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX answer_events_attempt ON public.answer_events (attempt_id, question_id, event_id);

GRANT SELECT ON public.answer_events TO authenticated;
GRANT ALL ON public.answer_events TO service_role;

ALTER TABLE public.answer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture du journal des reponses"
  ON public.answer_events FOR SELECT TO authenticated USING (true);

-- Journal en écriture seule : aucune modification ni suppression possible.
CREATE OR REPLACE FUNCTION public.forbid_mutation_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY: la table % est en ecriture seule (ni modification ni suppression).', TG_TABLE_NAME
    USING ERRCODE = 'P0474';
END;
$$;

CREATE TRIGGER trg_answer_events_append_only
  BEFORE UPDATE OR DELETE ON public.answer_events
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();

-- Contrôle de révision (optimistic concurrency) : révision strictement croissante.
CREATE OR REPLACE FUNCTION public.enforce_answer_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id
     OR NEW.question_id IS DISTINCT FROM OLD.question_id THEN
    RAISE EXCEPTION 'ANSWER_IDENTITY_IMMUTABLE: l''identite d''une reponse ne peut pas changer.'
      USING ERRCODE = 'P0475';
  END IF;

  IF NEW.revision <= OLD.revision THEN
    RAISE EXCEPTION 'ANSWER_STALE_REVISION: revision % obsolete (serveur = %).', NEW.revision, OLD.revision
      USING ERRCODE = 'P0409';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_answer_state_revision
  BEFORE UPDATE ON public.answer_state
  FOR EACH ROW EXECUTE FUNCTION public.enforce_answer_revision();

CREATE OR REPLACE FUNCTION public.forbid_answer_state_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'ANSWER_DELETE_FORBIDDEN: une reponse ne peut pas etre supprimee (%).', OLD.response_id
    USING ERRCODE = 'P0475';
END;
$$;

CREATE TRIGGER trg_answer_state_no_delete
  BEFORE DELETE ON public.answer_state
  FOR EACH ROW EXECUTE FUNCTION public.forbid_answer_state_delete();

-- Journalisation obligatoire de toute écriture de réponse.
CREATE OR REPLACE FUNCTION public.log_answer_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.answer_events (
    response_id, attempt_id, apprenant_id, question_id,
    valeur_precedente, valeur_nouvelle,
    revision_precedente, revision_nouvelle,
    origine, session_origine, auteur
  ) VALUES (
    NEW.response_id, NEW.attempt_id, NEW.apprenant_id, NEW.question_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.valeur ELSE NULL END,
    NEW.valeur,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.revision ELSE NULL END,
    NEW.revision,
    TG_OP, NEW.session_origine, NEW.updated_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_answer_state_journal
  AFTER INSERT OR UPDATE ON public.answer_state
  FOR EACH ROW EXECUTE FUNCTION public.log_answer_event();

-- =====================================================================
-- D'. QRC : identité définitive (structure vide, pilote existant intact)
-- =====================================================================
CREATE TABLE public.qrc_instances_v2 (
  qrc_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts_v2(attempt_id),
  question_id TEXT NOT NULL,
  apprenant_id UUID NOT NULL,
  reponse JSONB,
  etat TEXT NOT NULL DEFAULT 'en_attente',
  note NUMERIC,
  corrige_par UUID,
  corrige_email TEXT,
  corrige_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT qrc_instances_v2_etat_chk CHECK (etat IN ('en_attente','corrigee')),
  CONSTRAINT qrc_instances_v2_unique UNIQUE (attempt_id, question_id)
);

CREATE INDEX qrc_instances_v2_etat ON public.qrc_instances_v2 (etat, apprenant_id);

GRANT SELECT, INSERT, UPDATE ON public.qrc_instances_v2 TO authenticated;
GRANT ALL ON public.qrc_instances_v2 TO service_role;

ALTER TABLE public.qrc_instances_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des QRC authentifiee"
  ON public.qrc_instances_v2 FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creation de QRC authentifiee"
  ON public.qrc_instances_v2 FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Correction de QRC authentifiee"
  ON public.qrc_instances_v2 FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Une QRC corrigée ne revient jamais en attente, et n'est jamais supprimée.
CREATE OR REPLACE FUNCTION public.enforce_qrc_v2_finality()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'QRC_DELETE_FORBIDDEN: une QRC ne peut pas etre supprimee (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
     OR NEW.question_id IS DISTINCT FROM OLD.question_id
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id THEN
    RAISE EXCEPTION 'QRC_IDENTITY_IMMUTABLE: l''identite d''une QRC est definitive (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  IF OLD.etat = 'corrigee' AND NEW.etat <> 'corrigee' THEN
    RAISE EXCEPTION 'QRC_CORRECTION_FINALE: une QRC corrigee ne peut pas revenir en attente (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qrc_v2_finality
  BEFORE UPDATE OR DELETE ON public.qrc_instances_v2
  FOR EACH ROW EXECUTE FUNCTION public.enforce_qrc_v2_finality();

-- =====================================================================
-- 12. JOURNAL D'AUDIT INALTÉRABLE
-- =====================================================================
CREATE TABLE public.audit_journal (
  event_id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  cible_type TEXT NOT NULL,
  cible_id TEXT,
  exam_id TEXT,
  exam_version_id UUID,
  attempt_id UUID,
  apprenant_id UUID,
  auteur UUID,
  auteur_email TEXT,
  avant JSONB,
  apres JSONB,
  origine TEXT,
  session_technique TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_journal_cible ON public.audit_journal (cible_type, cible_id, event_id);
CREATE INDEX audit_journal_exam ON public.audit_journal (exam_id, created_at);

GRANT SELECT, INSERT ON public.audit_journal TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_journal_event_id_seq TO authenticated;
GRANT ALL ON public.audit_journal TO service_role;
GRANT ALL ON SEQUENCE public.audit_journal_event_id_seq TO service_role;

ALTER TABLE public.audit_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture du journal d audit"
  ON public.audit_journal FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ajout au journal d audit"
  ON public.audit_journal FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER trg_audit_journal_append_only
  BEFORE UPDATE OR DELETE ON public.audit_journal
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();

COMMENT ON TABLE public.exam_content_versions IS 'Noyau securise etape 1 : versions de contenu (brouillon/publiee/retiree), publiee = immuable. Structure vide, non encore lue par l''application.';
COMMENT ON TABLE public.exam_content_shares IS 'Noyau securise etape 1 : partages de matieres declares explicitement. Aucune propagation automatique.';
COMMENT ON TABLE public.exam_attempts_v2 IS 'Noyau securise etape 1 : tentatives avec attempt_id immuable, version publiee figee et snapshot.';
COMMENT ON TABLE public.answer_state IS 'Noyau securise etape 1 : etat courant des reponses, protege par revision croissante.';
COMMENT ON TABLE public.answer_events IS 'Noyau securise etape 1 : journal en ecriture seule de toutes les valeurs successives des reponses.';
COMMENT ON TABLE public.qrc_instances_v2 IS 'Noyau securise etape 1 : QRC avec identite definitive attempt_id + question_id, correction finale.';
COMMENT ON TABLE public.audit_journal IS 'Noyau securise etape 1 : journal d''audit inalterable (insertion seule).';
