CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_apprenant_id uuid, _exercice_id text, _exercice_type text, _reponses jsonb, _score numeric DEFAULT NULL::numeric, _bonnes_reponses integer DEFAULT NULL::integer, _total_questions integer DEFAULT NULL::integer)
 RETURNS reponses_apprenants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.reponses_apprenants;
  _is_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) INTO _is_owner;

  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.reponses_apprenants AS r (
    apprenant_id, user_id, exercice_id, exercice_type,
    reponses, score, bonnes_reponses, total_questions,
    completed, status, submitted_at, updated_at
  ) VALUES (
    _apprenant_id, COALESCE(auth.uid(), _apprenant_id), _exercice_id, _exercice_type,
    COALESCE(_reponses, '{}'::jsonb), _score, _bonnes_reponses, _total_questions,
    true, 'submitted', now(), now()
  )
  ON CONFLICT (apprenant_id, exercice_id) DO UPDATE SET
    exercice_type = EXCLUDED.exercice_type,
    reponses = CASE WHEN EXCLUDED.reponses = '{}'::jsonb THEN r.reponses ELSE EXCLUDED.reponses END,
    score = COALESCE(EXCLUDED.score, r.score),
    bonnes_reponses = COALESCE(EXCLUDED.bonnes_reponses, r.bonnes_reponses),
    total_questions = COALESCE(EXCLUDED.total_questions, r.total_questions),
    completed = true,
    status = 'submitted',
    submitted_at = COALESCE(r.submitted_at, now()),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;
