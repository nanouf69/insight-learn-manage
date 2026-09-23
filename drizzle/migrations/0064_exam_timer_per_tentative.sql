-- Chrono d'examen par tentative : une réouverture administrative (nouvelle
-- tentative) ouvre une fenêtre de temps complète ; F5, reconnexion ou reprise
-- normale réutilisent toujours la fenêtre existante de la tentative en cours.
ALTER TABLE public.apprenant_examen_timers
  ADD COLUMN IF NOT EXISTS tentative integer NOT NULL DEFAULT 1;

ALTER TABLE public.apprenant_examen_timers
  DROP CONSTRAINT IF EXISTS apprenant_examen_timers_unique;

CREATE UNIQUE INDEX IF NOT EXISTS apprenant_examen_timers_unique_tentative
  ON public.apprenant_examen_timers (apprenant_id, exercice_id, tentative);

CREATE OR REPLACE FUNCTION public.start_or_get_exam_timer(
  _apprenant_id uuid,
  _exercice_id text,
  _duree_secondes integer,
  _tentative integer
)
RETURNS TABLE(started_at timestamp with time zone, server_now timestamp with time zone, duree_secondes integer, remaining_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.apprenant_examen_timers%ROWTYPE;
  v_is_owner boolean;
  v_tentative integer := GREATEST(1, COALESCE(_tentative, 1));
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

  INSERT INTO public.apprenant_examen_timers (apprenant_id, user_id, exercice_id, duree_secondes, tentative)
  VALUES (_apprenant_id, auth.uid(), _exercice_id, _duree_secondes, v_tentative)
  ON CONFLICT (apprenant_id, exercice_id, tentative) DO NOTHING;

  SELECT * INTO v_row
  FROM public.apprenant_examen_timers
  WHERE apprenant_id = _apprenant_id
    AND exercice_id = _exercice_id
    AND tentative = v_tentative;

  RETURN QUERY
  SELECT
    v_row.started_at,
    clock_timestamp(),
    v_row.duree_secondes,
    GREATEST(0, v_row.duree_secondes - FLOOR(EXTRACT(EPOCH FROM (clock_timestamp() - v_row.started_at))))::integer;
END;
$function$;

-- Compatibilité : l'ancienne signature reprend la fenêtre de la dernière
-- tentative connue (jamais de remise à zéro implicite).
CREATE OR REPLACE FUNCTION public.start_or_get_exam_timer(
  _apprenant_id uuid,
  _exercice_id text,
  _duree_secondes integer
)
RETURNS TABLE(started_at timestamp with time zone, server_now timestamp with time zone, duree_secondes integer, remaining_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tentative integer;
BEGIN
  SELECT COALESCE(MAX(t.tentative), 1) INTO v_tentative
  FROM public.apprenant_examen_timers t
  WHERE t.apprenant_id = _apprenant_id AND t.exercice_id = _exercice_id;

  RETURN QUERY SELECT * FROM public.start_or_get_exam_timer(_apprenant_id, _exercice_id, _duree_secondes, v_tentative);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.start_or_get_exam_timer(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_or_get_exam_timer(uuid, text, integer, integer) TO service_role;