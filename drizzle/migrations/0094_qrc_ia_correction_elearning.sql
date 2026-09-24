-- Correction IA des QRC e-learning : configuration (désactivée), journal IA append-only,
-- demandes de vérification élève. Aucune donnée existante modifiée.

CREATE TABLE public.qrc_ia_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  actif boolean NOT NULL DEFAULT false,
  modele text NOT NULL DEFAULT 'google/gemini-3.8-flash',
  actif_depuis timestamptz,
  pause_motif text,
  pause_depuis timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_email text
);
GRANT SELECT ON public.qrc_ia_config TO authenticated;
GRANT ALL ON public.qrc_ia_config TO service_role;
ALTER TABLE public.qrc_ia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture config IA par admin" ON public.qrc_ia_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.qrc_ia_config (id, actif) VALUES (true, false);

CREATE TABLE public.qrc_ia_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle_idempotence text NOT NULL UNIQUE,
  qrc_instance_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  question_id text NOT NULL,
  exam_id text,
  matiere text,
  reponse_hash text NOT NULL,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','appliquee','a_verifier','exclue','erreur','ignoree')),
  motif text,
  note numeric,
  bareme numeric,
  justification text,
  modele text,
  http_status integer,
  cout_estime numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  termine_at timestamptz
);
CREATE INDEX idx_qrc_ia_corrections_qrc ON public.qrc_ia_corrections (qrc_instance_id);
CREATE INDEX idx_qrc_ia_corrections_attempt ON public.qrc_ia_corrections (attempt_id);
GRANT SELECT ON public.qrc_ia_corrections TO authenticated;
GRANT ALL ON public.qrc_ia_corrections TO service_role;
ALTER TABLE public.qrc_ia_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture IA admin" ON public.qrc_ia_corrections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecture IA eleve proprietaire" ON public.qrc_ia_corrections FOR SELECT TO authenticated
  USING (statut = 'appliquee' AND public.core_est_proprietaire(apprenant_id));

-- Journal append-only : seule la clôture d'une ligne « en_cours » est permise, jamais de suppression.
CREATE OR REPLACE FUNCTION public.qrc_ia_corrections_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'QRC_IA_APPEND_ONLY: suppression interdite.' USING ERRCODE = 'P0498';
  END IF;
  IF OLD.statut <> 'en_cours' THEN
    RAISE EXCEPTION 'QRC_IA_APPEND_ONLY: une correction IA terminée est définitive.' USING ERRCODE = 'P0498';
  END IF;
  IF NEW.cle_idempotence IS DISTINCT FROM OLD.cle_idempotence OR NEW.qrc_instance_id IS DISTINCT FROM OLD.qrc_instance_id
     OR NEW.reponse_hash IS DISTINCT FROM OLD.reponse_hash OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id THEN
    RAISE EXCEPTION 'QRC_IA_APPEND_ONLY: identité immuable.' USING ERRCODE = 'P0498';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_qrc_ia_corrections_append_only BEFORE UPDATE OR DELETE ON public.qrc_ia_corrections
  FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_corrections_append_only();

CREATE TABLE public.qrc_verification_demandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qrc_instance_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  question_id text NOT NULL,
  statut text NOT NULL DEFAULT 'a_traiter' CHECK (statut IN ('a_traiter','traitee')),
  note_ia numeric,
  note_finale numeric,
  traitee_par uuid,
  traitee_email text,
  traitee_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_qrc_verification_active ON public.qrc_verification_demandes (qrc_instance_id) WHERE statut = 'a_traiter';
GRANT SELECT ON public.qrc_verification_demandes TO authenticated;
GRANT ALL ON public.qrc_verification_demandes TO service_role;
ALTER TABLE public.qrc_verification_demandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture demandes admin" ON public.qrc_verification_demandes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecture demandes eleve" ON public.qrc_verification_demandes FOR SELECT TO authenticated
  USING (public.core_est_proprietaire(apprenant_id));

CREATE OR REPLACE FUNCTION public.qrc_verification_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'QRC_VERIF_APPEND_ONLY: suppression interdite.' USING ERRCODE = 'P0498';
  END IF;
  IF OLD.statut = 'traitee' THEN
    RAISE EXCEPTION 'QRC_VERIF_APPEND_ONLY: demande déjà traitée.' USING ERRCODE = 'P0498';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_qrc_verification_append_only BEFORE UPDATE OR DELETE ON public.qrc_verification_demandes
  FOR EACH ROW EXECUTE FUNCTION public.qrc_verification_append_only();

-- Élève : demande de vérification d'une QRC corrigée par IA. Ne modifie jamais la note.
CREATE OR REPLACE FUNCTION public.qrc_demander_verification(p_qrc_instance_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inst public.qrc_instances_v2%ROWTYPE;
  d public.qrc_verification_demandes%ROWTYPE;
BEGIN
  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QRC_INTROUVABLE' USING ERRCODE = 'P0476';
  END IF;
  IF NOT public.core_est_proprietaire(inst.apprenant_id) THEN
    RAISE EXCEPTION 'VERIFICATION_NON_AUTORISEE: cette QRC ne vous appartient pas.' USING ERRCODE = 'P0481';
  END IF;
  IF inst.etat <> 'corrigee' OR coalesce(inst.corrige_email, '') NOT LIKE 'ia:%' THEN
    RAISE EXCEPTION 'VERIFICATION_INUTILE: cette QRC n''a pas de correction IA en attente de vérification.' USING ERRCODE = 'P0481';
  END IF;
  INSERT INTO public.qrc_verification_demandes (qrc_instance_id, attempt_id, apprenant_id, question_id, note_ia)
  VALUES (inst.qrc_instance_id, inst.attempt_id, inst.apprenant_id, inst.question_id, inst.note)
  ON CONFLICT (qrc_instance_id) WHERE statut = 'a_traiter' DO NOTHING
  RETURNING * INTO d;
  IF d.id IS NULL THEN
    SELECT * INTO d FROM public.qrc_verification_demandes WHERE qrc_instance_id = p_qrc_instance_id AND statut = 'a_traiter';
    RETURN jsonb_build_object('ok', true, 'deja_demandee', true, 'id', d.id);
  END IF;
  RETURN jsonb_build_object('ok', true, 'deja_demandee', false, 'id', d.id);
END $$;
REVOKE ALL ON FUNCTION public.qrc_demander_verification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_demander_verification(uuid) TO authenticated;

-- Admin : interrupteur général.
CREATE OR REPLACE FUNCTION public.qrc_ia_definir_actif(p_actif boolean, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE avant public.qrc_ia_config%ROWTYPE; apres public.qrc_ia_config%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'IA_CONFIG_NON_AUTORISEE' USING ERRCODE = 'P0481';
  END IF;
  SELECT * INTO avant FROM public.qrc_ia_config WHERE id FOR UPDATE;
  UPDATE public.qrc_ia_config SET
    actif = p_actif,
    actif_depuis = CASE WHEN p_actif AND NOT avant.actif THEN now() WHEN p_actif THEN avant.actif_depuis ELSE avant.actif_depuis END,
    pause_motif = CASE WHEN p_actif THEN NULL ELSE avant.pause_motif END,
    pause_depuis = CASE WHEN p_actif THEN NULL ELSE avant.pause_depuis END,
    updated_at = now(), updated_by = auth.uid(), updated_email = p_email
  WHERE id RETURNING * INTO apres;
  INSERT INTO public.audit_journal (operation, cible_type, cible_id, auteur, auteur_email, avant, apres, origine)
  VALUES ('qrc_ia_interrupteur', 'qrc_ia_config', 'global', auth.uid(), p_email,
          jsonb_build_object('actif', avant.actif), jsonb_build_object('actif', apres.actif, 'actif_depuis', apres.actif_depuis),
          'qrc_ia_definir_actif');
  RETURN jsonb_build_object('actif', apres.actif, 'actif_depuis', apres.actif_depuis);
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_definir_actif(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_definir_actif(boolean, text) TO authenticated;

-- Une correction humaine (email non « ia: ») clôt la demande de vérification ouverte.
CREATE OR REPLACE FUNCTION public.qrc_verification_cloture_humaine()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.etat = 'corrigee' AND NEW.corrige_email IS NOT NULL AND NEW.corrige_email NOT LIKE 'ia:%'
     AND (NEW.corrige_at IS DISTINCT FROM OLD.corrige_at OR NEW.corrige_email IS DISTINCT FROM OLD.corrige_email) THEN
    UPDATE public.qrc_verification_demandes
    SET statut = 'traitee', note_finale = NEW.note, traitee_par = NEW.corrige_par,
        traitee_email = NEW.corrige_email, traitee_at = now()
    WHERE qrc_instance_id = NEW.qrc_instance_id AND statut = 'a_traiter';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_qrc_verification_cloture AFTER UPDATE ON public.qrc_instances_v2
  FOR EACH ROW EXECUTE FUNCTION public.qrc_verification_cloture_humaine();
