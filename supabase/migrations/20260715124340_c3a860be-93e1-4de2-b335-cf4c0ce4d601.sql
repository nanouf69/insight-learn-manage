
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'error',
  source TEXT NOT NULL DEFAULT 'client',
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  route TEXT,
  user_agent TEXT,
  user_id UUID,
  user_email TEXT,
  context JSONB,
  fingerprint TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_fingerprint ON public.error_logs (fingerprint);
CREATE INDEX idx_error_logs_resolved ON public.error_logs (resolved, last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.error_logs TO authenticated;
GRANT INSERT ON public.error_logs TO anon;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (even logged out portals) can insert an error log
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read / update
CREATE POLICY "Admins can view error logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update error logs"
ON public.error_logs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Upsert helper: aggregates identical errors by fingerprint
CREATE OR REPLACE FUNCTION public.log_error(
  _message TEXT,
  _level TEXT DEFAULT 'error',
  _source TEXT DEFAULT 'client',
  _stack TEXT DEFAULT NULL,
  _component_stack TEXT DEFAULT NULL,
  _url TEXT DEFAULT NULL,
  _route TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _user_id UUID DEFAULT NULL,
  _user_email TEXT DEFAULT NULL,
  _context JSONB DEFAULT NULL,
  _fingerprint TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id UUID;
  _fp TEXT;
BEGIN
  _fp := COALESCE(_fingerprint, md5(COALESCE(_route,'') || '|' || _message));

  SELECT id INTO _existing_id
  FROM public.error_logs
  WHERE fingerprint = _fp
    AND resolved = false
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.error_logs
    SET count = count + 1,
        last_seen_at = now(),
        user_id = COALESCE(user_id, _user_id),
        user_email = COALESCE(user_email, _user_email)
    WHERE id = _existing_id;
    RETURN _existing_id;
  END IF;

  INSERT INTO public.error_logs (
    level, source, message, stack, component_stack, url, route,
    user_agent, user_id, user_email, context, fingerprint
  ) VALUES (
    _level, _source, _message, _stack, _component_stack, _url, _route,
    _user_agent, _user_id, _user_email, _context, _fp
  ) RETURNING id INTO _existing_id;

  RETURN _existing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_error(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;
