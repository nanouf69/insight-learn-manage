-- Nouveau moteur QRC : 1 QRC = 1 identifiant unique et immuable.
-- Additif uniquement : aucune table existante n'est modifiée.

CREATE TYPE public.qrc_instance_etat AS ENUM ('en_attente', 'corrigee');

CREATE TABLE public.qrc_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id UUID NOT NULL,
  quiz_id TEXT NOT NULL,
  attempt_id UUID NOT NULL,
  matiere_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  reponse_eleve TEXT NOT NULL DEFAULT '',
  points_max NUMERIC NOT NULL DEFAULT 0,
  etat public.qrc_instance_etat NOT NULL DEFAULT 'en_attente',
  points_obtenus NUMERIC,
  commentaire TEXT,
  corrected_by UUID,
  corrected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT qrc_instances_identity_unique
    UNIQUE (apprenant_id, quiz_id, attempt_id, matiere_id, question_id)
);

CREATE INDEX idx_qrc_instances_queue ON public.qrc_instances (etat, quiz_id, created_at DESC);
CREATE INDEX idx_qrc_instances_attempt ON public.qrc_instances (attempt_id);
CREATE INDEX idx_qrc_instances_apprenant ON public.qrc_instances (apprenant_id);

GRANT SELECT, INSERT, UPDATE ON public.qrc_instances TO authenticated;
GRANT ALL ON public.qrc_instances TO service_role;

ALTER TABLE public.qrc_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apprenant lit ses propres QRC"
ON public.qrc_instances FOR SELECT TO authenticated
USING (public.is_current_user_apprenant(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin met a jour les QRC"
ON public.qrc_instances FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drapeau d'activation par examen : le nouveau moteur ne tourne que sur les quiz listes ici.
CREATE TABLE public.qrc_engine_flags (
  quiz_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.qrc_engine_flags TO authenticated;
GRANT ALL ON public.qrc_engine_flags TO service_role;

ALTER TABLE public.qrc_engine_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des drapeaux QRC"
ON public.qrc_engine_flags FOR SELECT TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.qrc_engine_enabled(_quiz_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT enabled FROM public.qrc_engine_flags WHERE quiz_id = _quiz_id), false)
$$;

CREATE OR REPLACE FUNCTION public.touch_qrc_instances()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_qrc_instances
BEFORE UPDATE ON public.qrc_instances
FOR EACH ROW EXECUTE FUNCTION public.touch_qrc_instances();

-- Une instance corrigee n'est jamais reecrite par une sauvegarde d'eleve.
CREATE OR REPLACE FUNCTION public.upsert_qrc_instances(
  p_apprenant_id UUID,
  p_quiz_id TEXT,
  p_attempt_id UUID,
  p_matiere_id TEXT,
  p_items JSONB
)
RETURNS SETOF public.qrc_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
BEGIN
  IF p_apprenant_id IS NULL OR p_quiz_id IS NULL OR p_attempt_id IS NULL OR p_matiere_id IS NULL THEN
    RAISE EXCEPTION 'QRC_INSTANCE_IDENTITE_INCOMPLETE' USING ERRCODE = 'P0461';
  END IF;

  IF NOT public.qrc_engine_enabled(p_quiz_id) THEN
    RAISE EXCEPTION 'QRC_ENGINE_DESACTIVE_POUR_CE_QUIZ' USING ERRCODE = 'P0462';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    IF COALESCE(item->>'question_id', '') = '' THEN
      RAISE EXCEPTION 'QRC_INSTANCE_QUESTION_ID_MANQUANT' USING ERRCODE = 'P0463';
    END IF;

    INSERT INTO public.qrc_instances (
      apprenant_id, quiz_id, attempt_id, matiere_id, question_id, reponse_eleve, points_max
    ) VALUES (
      p_apprenant_id,
      p_quiz_id,
      p_attempt_id,
      p_matiere_id,
      item->>'question_id',
      COALESCE(item->>'reponse_eleve', ''),
      COALESCE((item->>'points_max')::numeric, 0)
    )
    ON CONFLICT (apprenant_id, quiz_id, attempt_id, matiere_id, question_id)
    DO UPDATE SET
      reponse_eleve = CASE
        WHEN public.qrc_instances.etat = 'corrigee' THEN public.qrc_instances.reponse_eleve
        ELSE EXCLUDED.reponse_eleve
      END,
      points_max = CASE
        WHEN public.qrc_instances.etat = 'corrigee' THEN public.qrc_instances.points_max
        ELSE EXCLUDED.points_max
      END;
  END LOOP;

  RETURN QUERY
    SELECT * FROM public.qrc_instances
    WHERE apprenant_id = p_apprenant_id
      AND quiz_id = p_quiz_id
      AND attempt_id = p_attempt_id
      AND matiere_id = p_matiere_id
    ORDER BY created_at, question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_qrc_instance(
  p_instance_id UUID,
  p_points NUMERIC,
  p_commentaire TEXT
)
RETURNS public.qrc_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.qrc_instances;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'QRC_VALIDATION_NON_AUTORISEE' USING ERRCODE = 'P0464';
  END IF;

  UPDATE public.qrc_instances
  SET etat = 'corrigee',
      points_obtenus = p_points,
      commentaire = p_commentaire,
      corrected_by = auth.uid(),
      corrected_at = now()
  WHERE id = p_instance_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'QRC_INSTANCE_INTROUVABLE' USING ERRCODE = 'P0465';
  END IF;

  RETURN result;
END;
$$;

-- Source unique pour le blocage de la note d'un passage.
CREATE OR REPLACE FUNCTION public.qrc_attempt_publication_state(p_attempt_id UUID)
RETURNS TABLE(total INTEGER, corrigees INTEGER, en_attente INTEGER, publiable BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE etat = 'corrigee')::int AS corrigees,
    COUNT(*) FILTER (WHERE etat = 'en_attente')::int AS en_attente,
    COUNT(*) FILTER (WHERE etat = 'en_attente') = 0 AS publiable
  FROM public.qrc_instances
  WHERE attempt_id = p_attempt_id
    AND btrim(reponse_eleve) <> ''
$$;
