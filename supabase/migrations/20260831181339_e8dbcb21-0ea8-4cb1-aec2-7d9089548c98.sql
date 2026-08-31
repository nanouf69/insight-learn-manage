CREATE OR REPLACE FUNCTION public.save_module_completion(_apprenant_id uuid, _module_id integer, _completed boolean DEFAULT false, _progress integer DEFAULT 0, _score_obtenu integer DEFAULT NULL::integer, _score_max integer DEFAULT NULL::integer, _details jsonb DEFAULT NULL::jsonb)
 RETURNS apprenant_module_completion
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed BOOLEAN;
  result public.apprenant_module_completion;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role'
  INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not authorized for this apprenant';
  END IF;

  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, score_obtenu, score_max, details)
  VALUES (
    _apprenant_id,
    _module_id,
    CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN _completed THEN 100 ELSE GREATEST(COALESCE(_progress, 0), 0) END,
    now(),
    _score_obtenu,
    _score_max,
    COALESCE(_details, '[]'::jsonb)
  )
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET status = CASE WHEN amc.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
      progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0), CASE WHEN _completed THEN 100 ELSE 0 END),
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at
                          WHEN _completed THEN now() ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE
                  WHEN _details IS NULL THEN amc.details
                  WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                  ELSE _details
                END
  RETURNING * INTO result;

  RETURN result;
END;
$function$;