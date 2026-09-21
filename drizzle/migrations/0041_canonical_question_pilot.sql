-- PILOTE ISOLÉ : nouvelle architecture "question canonique par identité pédagogique".
-- N'altère aucune table existante, aucun trigger existant, aucune donnée pédagogique.

CREATE TABLE public.canonical_questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'qcm',
  enonce TEXT NOT NULL DEFAULT '',
  choix JSONB NOT NULL DEFAULT '[]'::jsonb,
  bonnes_reponses JSONB NOT NULL DEFAULT '[]'::jsonb,
  explication TEXT,
  explications_choix JSONB NOT NULL DEFAULT '[]'::jsonb,
  reponse_qrc TEXT,
  mots_cles JSONB NOT NULL DEFAULT '[]'::jsonb,
  bareme NUMERIC NOT NULL DEFAULT 1,
  coefficient NUMERIC NOT NULL DEFAULT 1,
  medias JSONB NOT NULL DEFAULT '[]'::jsonb,
  proprietes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pilot BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canonical_questions TO authenticated;
GRANT ALL ON public.canonical_questions TO service_role;
ALTER TABLE public.canonical_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canonical_questions_admin_all" ON public.canonical_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.canonical_question_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.canonical_questions(question_id) ON DELETE CASCADE,
  usage_kind TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  module_id INTEGER,
  exercise_id BIGINT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, usage_kind, quiz_id, module_id, exercise_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canonical_question_usages TO authenticated;
GRANT ALL ON public.canonical_question_usages TO service_role;
ALTER TABLE public.canonical_question_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canonical_usages_admin_all" ON public.canonical_question_usages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.canonical_question_write_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  expected_version INTEGER,
  server_version_before INTEGER,
  resulting_version INTEGER,
  accepted BOOLEAN NOT NULL,
  reason TEXT,
  origin TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.canonical_question_write_log TO authenticated;
GRANT ALL ON public.canonical_question_write_log TO service_role;
ALTER TABLE public.canonical_question_write_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canonical_write_log_admin_read" ON public.canonical_question_write_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.canonical_exam_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT NOT NULL,
  apprenant_ref TEXT NOT NULL,
  tentative INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot JSONB NOT NULL,
  snapshot_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pilot BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (quiz_id, apprenant_ref, tentative)
);

GRANT SELECT, INSERT ON public.canonical_exam_attempts TO authenticated;
GRANT ALL ON public.canonical_exam_attempts TO service_role;
ALTER TABLE public.canonical_exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canonical_attempts_admin_read" ON public.canonical_exam_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Snapshot strictement immuable
CREATE OR REPLACE FUNCTION public.canonical_attempt_snapshot_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.snapshot_versions IS DISTINCT FROM OLD.snapshot_versions
     OR NEW.quiz_id IS DISTINCT FROM OLD.quiz_id
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'Snapshot de tentative immuable' USING ERRCODE = 'P0472';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_canonical_attempt_immutable
BEFORE UPDATE ON public.canonical_exam_attempts
FOR EACH ROW EXECUTE FUNCTION public.canonical_attempt_snapshot_immutable();

CREATE TABLE public.canonical_pilot_flags (
  scope_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.canonical_pilot_flags TO authenticated;
GRANT ALL ON public.canonical_pilot_flags TO service_role;
ALTER TABLE public.canonical_pilot_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canonical_flags_admin_read" ON public.canonical_pilot_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Écriture atomique avec contrôle de version serveur (compare-and-swap strict)
CREATE OR REPLACE FUNCTION public.canonical_update_question(
  p_question_id UUID,
  p_expected_version INTEGER,
  p_fields JSONB,
  p_origin TEXT DEFAULT 'admin'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.canonical_questions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.canonical_questions
   WHERE question_id = p_question_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question canonique introuvable' USING ERRCODE = 'P0404';
  END IF;

  IF v_row.version <> p_expected_version THEN
    INSERT INTO public.canonical_question_write_log
      (question_id, expected_version, server_version_before, resulting_version, accepted, reason, origin, payload)
    VALUES (p_question_id, p_expected_version, v_row.version, v_row.version, false,
            'stale_write_refused', p_origin, p_fields);
    RAISE EXCEPTION 'Écriture obsolète refusée (version serveur %, version attendue %)', v_row.version, p_expected_version
      USING ERRCODE = 'P0409';
  END IF;

  UPDATE public.canonical_questions SET
    type = COALESCE(p_fields->>'type', type),
    enonce = COALESCE(p_fields->>'enonce', enonce),
    choix = COALESCE(p_fields->'choix', choix),
    bonnes_reponses = COALESCE(p_fields->'bonnes_reponses', bonnes_reponses),
    explication = COALESCE(p_fields->>'explication', explication),
    explications_choix = COALESCE(p_fields->'explications_choix', explications_choix),
    reponse_qrc = COALESCE(p_fields->>'reponse_qrc', reponse_qrc),
    mots_cles = COALESCE(p_fields->'mots_cles', mots_cles),
    bareme = COALESCE((p_fields->>'bareme')::numeric, bareme),
    coefficient = COALESCE((p_fields->>'coefficient')::numeric, coefficient),
    medias = COALESCE(p_fields->'medias', medias),
    proprietes = COALESCE(p_fields->'proprietes', proprietes),
    version = version + 1,
    updated_at = now()
  WHERE question_id = p_question_id
  RETURNING * INTO v_row;

  INSERT INTO public.canonical_question_write_log
    (question_id, expected_version, server_version_before, resulting_version, accepted, reason, origin, payload)
  VALUES (p_question_id, p_expected_version, p_expected_version, v_row.version, true, 'accepted', p_origin, p_fields);

  RETURN to_jsonb(v_row);
END;
$$;

-- Résolution EXCLUSIVEMENT par identifiant immuable (jamais par texte)
CREATE OR REPLACE FUNCTION public.canonical_get_quiz_questions(p_quiz_id TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(q) || jsonb_build_object('position', u.position) ORDER BY u.position), '[]'::jsonb)
  FROM public.canonical_question_usages u
  JOIN public.canonical_questions q ON q.question_id = u.question_id
  WHERE u.quiz_id = p_quiz_id;
$$;

-- Démarrage de tentative : snapshot figé depuis la source canonique, idempotent
CREATE OR REPLACE FUNCTION public.canonical_start_exam_attempt(
  p_quiz_id TEXT,
  p_apprenant_ref TEXT,
  p_tentative INTEGER DEFAULT 1
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.canonical_exam_attempts%ROWTYPE;
  v_snapshot JSONB;
  v_versions JSONB;
BEGIN
  SELECT * INTO v_existing FROM public.canonical_exam_attempts
   WHERE quiz_id = p_quiz_id AND apprenant_ref = p_apprenant_ref AND tentative = p_tentative;
  IF FOUND THEN
    RETURN to_jsonb(v_existing);
  END IF;

  v_snapshot := public.canonical_get_quiz_questions(p_quiz_id);
  SELECT COALESCE(jsonb_object_agg(e->>'question_id', e->'version'), '{}'::jsonb)
    INTO v_versions FROM jsonb_array_elements(v_snapshot) e;

  INSERT INTO public.canonical_exam_attempts (quiz_id, apprenant_ref, tentative, snapshot, snapshot_versions)
  VALUES (p_quiz_id, p_apprenant_ref, p_tentative, v_snapshot, v_versions)
  ON CONFLICT (quiz_id, apprenant_ref, tentative) DO NOTHING
  RETURNING * INTO v_existing;

  IF v_existing.attempt_id IS NULL THEN
    SELECT * INTO v_existing FROM public.canonical_exam_attempts
     WHERE quiz_id = p_quiz_id AND apprenant_ref = p_apprenant_ref AND tentative = p_tentative;
  END IF;

  RETURN to_jsonb(v_existing);
END;
$$;
