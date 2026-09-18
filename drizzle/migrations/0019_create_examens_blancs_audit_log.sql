CREATE TABLE public.examens_blancs_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  author_user_id uuid,
  author_email text,
  exam_id text NOT NULL,
  filiere text,
  numero_examen integer,
  matiere_id text,
  matiere_nom text,
  question_id text,
  action text NOT NULL,
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb
);

CREATE INDEX idx_examens_blancs_audit_log_exam ON public.examens_blancs_audit_log (exam_id, created_at DESC);
CREATE INDEX idx_examens_blancs_audit_log_created ON public.examens_blancs_audit_log (created_at DESC);

GRANT SELECT, INSERT ON public.examens_blancs_audit_log TO authenticated;
GRANT ALL ON public.examens_blancs_audit_log TO service_role;

ALTER TABLE public.examens_blancs_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read exam audit log"
ON public.examens_blancs_audit_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can write exam audit log"
ON public.examens_blancs_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);