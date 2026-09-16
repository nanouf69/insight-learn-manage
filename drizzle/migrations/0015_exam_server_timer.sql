-- Chronomètre serveur des examens blancs (additif, n'affecte aucune donnée existante)
CREATE TABLE IF NOT EXISTS public.apprenant_examen_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  user_id uuid,
  exercice_id text NOT NULL,
  duree_secondes integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apprenant_examen_timers_unique UNIQUE (apprenant_id, exercice_id)
);

GRANT SELECT ON public.apprenant_examen_timers TO authenticated;
GRANT ALL ON public.apprenant_examen_timers TO service_role;

ALTER TABLE public.apprenant_examen_timers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apprenant lit son propre chrono" ON public.apprenant_examen_timers;
CREATE POLICY "Apprenant lit son propre chrono"
ON public.apprenant_examen_timers
FOR SELECT
TO authenticated
USING (public.is_current_user_apprenant(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

-- Démarre (une seule fois) ou relit le chronomètre serveur d'une matière.
CREATE OR REPLACE FUNCTION public.start_or_get_exam_timer(
  _apprenant_id uuid,
  _exercice_id text,
  _duree_secondes integer
)
RETURNS TABLE(started_at timestamptz, server_now timestamptz, duree_secondes integer, remaining_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.apprenant_examen_timers%ROWTYPE;
BEGIN
  IF NOT (public.is_current_user_apprenant(_apprenant_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _duree_secondes IS NULL OR _duree_secondes <= 0 THEN
    RAISE EXCEPTION 'invalid_duration';
  END IF;

  INSERT INTO public.apprenant_examen_timers (apprenant_id, user_id, exercice_id, duree_secondes)
  VALUES (_apprenant_id, auth.uid(), _exercice_id, _duree_secondes)
  ON CONFLICT (apprenant_id, exercice_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.apprenant_examen_timers
  WHERE apprenant_id = _apprenant_id AND exercice_id = _exercice_id;

  RETURN QUERY
  SELECT
    v_row.started_at,
    now(),
    v_row.duree_secondes,
    GREATEST(0, v_row.duree_secondes - FLOOR(EXTRACT(EPOCH FROM (now() - v_row.started_at))))::integer;
END;
$$;

REVOKE ALL ON FUNCTION public.start_or_get_exam_timer(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_or_get_exam_timer(uuid, text, integer) TO authenticated, service_role;