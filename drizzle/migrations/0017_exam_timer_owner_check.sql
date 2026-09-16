-- Le chronomètre doit rester lisible même si la présence a expiré : on vérifie
-- la propriété du dossier (et non la session de présence), sinon un apprenant
-- pourrait récupérer du temps en perdant sa session.
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
  v_is_owner boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id
      AND (a.id = auth.uid() OR a.auth_user_id = auth.uid())
  ) INTO v_is_owner;

  IF NOT (v_is_owner OR public.has_role(auth.uid(), 'admin')) THEN
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