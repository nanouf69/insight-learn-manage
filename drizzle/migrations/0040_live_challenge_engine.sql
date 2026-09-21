-- Module "Challenge en direct" : tables totalement séparées des examens blancs / e-learning
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL DEFAULT 'Challenge en direct',
  source_quiz_id TEXT,
  source_label TEXT,
  questions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  statut TEXT NOT NULL DEFAULT 'en_cours',
  current_index INTEGER NOT NULL DEFAULT 0,
  reveal_results BOOLEAN NOT NULL DEFAULT false,
  masquer_noms BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.live_sessions TO authenticated;
GRANT SELECT ON public.live_sessions TO anon;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_sessions admin all" ON public.live_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "live_sessions public read" ON public.live_sessions
  FOR SELECT TO anon USING (statut <> 'terminee');

CREATE TABLE public.live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  display_name TEXT NOT NULL,
  apprenant_id UUID,
  score NUMERIC NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (live_session_id, device_token)
);

CREATE INDEX idx_live_participants_session ON public.live_participants(live_session_id);
GRANT SELECT, INSERT, UPDATE ON public.live_participants TO authenticated;
GRANT SELECT ON public.live_participants TO anon;
GRANT ALL ON public.live_participants TO service_role;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_participants admin all" ON public.live_participants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "live_participants public read" ON public.live_participants
  FOR SELECT TO anon USING (true);

CREATE TABLE public.live_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.live_participants(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_index INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL DEFAULT 'qcm',
  reponse TEXT,
  est_correcte BOOLEAN,
  points_max NUMERIC NOT NULL DEFAULT 1,
  points_obtenus NUMERIC,
  corrigee_manuellement BOOLEAN NOT NULL DEFAULT false,
  commentaire TEXT,
  corrected_by UUID,
  corrected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (live_session_id, participant_id, question_id)
);

CREATE INDEX idx_live_responses_session ON public.live_responses(live_session_id);
GRANT SELECT, INSERT, UPDATE ON public.live_responses TO authenticated;
GRANT SELECT ON public.live_responses TO anon;
GRANT ALL ON public.live_responses TO service_role;
ALTER TABLE public.live_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_responses admin all" ON public.live_responses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "live_responses public read" ON public.live_responses
  FOR SELECT TO anon USING (true);

-- Rejoindre un challenge : idempotent (reconnexion = meme participant)
CREATE OR REPLACE FUNCTION public.live_join_session(
  _code TEXT,
  _device_token TEXT,
  _display_name TEXT
)
RETURNS public.live_participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.live_sessions;
  v_participant public.live_participants;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE upper(code) = upper(_code);
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Challenge introuvable' USING ERRCODE = 'P0480';
  END IF;
  IF v_session.statut = 'terminee' THEN
    RAISE EXCEPTION 'Challenge termine' USING ERRCODE = 'P0481';
  END IF;

  INSERT INTO public.live_participants (live_session_id, device_token, display_name)
  VALUES (v_session.id, _device_token, NULLIF(trim(_display_name), ''))
  ON CONFLICT (live_session_id, device_token)
  DO UPDATE SET last_seen_at = now(),
                display_name = COALESCE(NULLIF(trim(EXCLUDED.display_name), ''), public.live_participants.display_name)
  RETURNING * INTO v_participant;

  RETURN v_participant;
END;
$$;

-- Enregistrement d'une reponse : 1 reponse = 1 identifiant unique, jamais de doublon
CREATE OR REPLACE FUNCTION public.live_submit_response(
  _participant_id UUID,
  _device_token TEXT,
  _question_id TEXT,
  _question_index INTEGER,
  _question_type TEXT,
  _reponse TEXT,
  _est_correcte BOOLEAN,
  _points_max NUMERIC
)
RETURNS public.live_responses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant public.live_participants;
  v_response public.live_responses;
BEGIN
  SELECT * INTO v_participant
  FROM public.live_participants
  WHERE id = _participant_id AND device_token = _device_token;

  IF v_participant.id IS NULL THEN
    RAISE EXCEPTION 'Participant inconnu' USING ERRCODE = 'P0482';
  END IF;

  INSERT INTO public.live_responses (
    live_session_id, participant_id, question_id, question_index, question_type,
    reponse, est_correcte, points_max, points_obtenus
  )
  VALUES (
    v_participant.live_session_id, v_participant.id, _question_id,
    COALESCE(_question_index, 0), COALESCE(_question_type, 'qcm'),
    _reponse, _est_correcte, COALESCE(_points_max, 1),
    CASE WHEN COALESCE(_question_type, 'qcm') = 'qrc' THEN NULL
         WHEN _est_correcte THEN COALESCE(_points_max, 1) ELSE 0 END
  )
  ON CONFLICT (live_session_id, participant_id, question_id) DO NOTHING
  RETURNING * INTO v_response;

  IF v_response.id IS NULL THEN
    SELECT * INTO v_response FROM public.live_responses
    WHERE live_session_id = v_participant.live_session_id
      AND participant_id = v_participant.id
      AND question_id = _question_id;
  END IF;

  UPDATE public.live_participants
  SET last_seen_at = now(),
      score = COALESCE((
        SELECT SUM(COALESCE(points_obtenus, 0)) FROM public.live_responses
        WHERE participant_id = v_participant.id
      ), 0)
  WHERE id = v_participant.id;

  RETURN v_response;
END;
$$;

-- Correction manuelle d'une QRC en direct : cible l'identifiant unique de la reponse
CREATE OR REPLACE FUNCTION public.live_correct_response(
  _response_id UUID,
  _points NUMERIC,
  _commentaire TEXT
)
RETURNS public.live_responses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response public.live_responses;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Correction reservee au formateur' USING ERRCODE = 'P0483';
  END IF;

  UPDATE public.live_responses
  SET points_obtenus = _points,
      commentaire = _commentaire,
      corrigee_manuellement = true,
      corrected_by = auth.uid(),
      corrected_at = now(),
      est_correcte = (_points >= points_max),
      updated_at = now()
  WHERE id = _response_id
  RETURNING * INTO v_response;

  IF v_response.id IS NULL THEN
    RAISE EXCEPTION 'Reponse introuvable' USING ERRCODE = 'P0484';
  END IF;

  UPDATE public.live_participants
  SET score = COALESCE((
        SELECT SUM(COALESCE(points_obtenus, 0)) FROM public.live_responses
        WHERE participant_id = v_response.participant_id
      ), 0)
  WHERE id = v_response.participant_id;

  RETURN v_response;
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_join_session(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_submit_response(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_correct_response(UUID, NUMERIC, TEXT) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_responses;
ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.live_participants REPLICA IDENTITY FULL;
ALTER TABLE public.live_responses REPLICA IDENTITY FULL;
