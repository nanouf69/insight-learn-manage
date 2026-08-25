CREATE TABLE public.grilles_notation_conduite (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apprenant_id uuid NOT NULL,
  session_id uuid,
  date_passage date NOT NULL DEFAULT CURRENT_DATE,
  passage text,
  type_formation text NOT NULL DEFAULT 'vtc',
  criteres jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes_themes jsonb NOT NULL DEFAULT '{}'::jsonb,
  note_globale numeric,
  observations text,
  evaluateur text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grilles_notation_conduite TO authenticated;
GRANT ALL ON public.grilles_notation_conduite TO service_role;

ALTER TABLE public.grilles_notation_conduite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage grilles notation"
ON public.grilles_notation_conduite
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_grilles_notation_apprenant ON public.grilles_notation_conduite(apprenant_id);
CREATE INDEX idx_grilles_notation_session ON public.grilles_notation_conduite(session_id);

CREATE TRIGGER set_grilles_notation_updated_at
BEFORE UPDATE ON public.grilles_notation_conduite
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();