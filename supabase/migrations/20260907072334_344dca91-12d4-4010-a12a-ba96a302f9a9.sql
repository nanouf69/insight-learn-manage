ALTER TABLE public.apprenant_module_completion
  ADD COLUMN IF NOT EXISTS pages_completees jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.save_module_pages_progress(
  _apprenant_id uuid,
  _module_id integer,
  _pages jsonb,
  _progress integer DEFAULT 0
)
RETURNS public.apprenant_module_completion
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
    (apprenant_id, module_id, status, progress, completed_at, details, pages_completees)
  VALUES (
    _apprenant_id,
    _module_id,
    'in_progress',
    GREATEST(COALESCE(_progress, 0), 0),
    now(),
    '[]'::jsonb,
    COALESCE(_pages, '[]'::jsonb)
  )
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0)),
      pages_completees = (
        SELECT COALESCE(jsonb_agg(DISTINCT p ORDER BY p), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(amc.pages_completees, '[]'::jsonb) || COALESCE(_pages, '[]'::jsonb)) AS t(p)
      )
  RETURNING * INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_module_pages_progress(uuid, integer, jsonb, integer) TO authenticated, service_role;