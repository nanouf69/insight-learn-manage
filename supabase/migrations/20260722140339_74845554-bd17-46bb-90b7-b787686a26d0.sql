
CREATE TABLE public.module_admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id INTEGER NOT NULL,
  module_nom TEXT,
  action TEXT NOT NULL, -- 'admin_edit' | 'resync_overwrite'
  origin TEXT, -- e.g. 'forceBilanExamGestionFromSource', 'syncSharedExercisesToSiblingModules', 'ModuleDetailView.performDbSave'
  exercice_id TEXT,
  question_id TEXT,
  field TEXT, -- 'enonce' | 'choix' | 'image' | 'reponseCorrecte' | 'question_deleted' | ...
  summary TEXT,
  before_value JSONB,
  after_value JSONB,
  author_user_id UUID,
  author_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_module_admin_audit_log_module_id ON public.module_admin_audit_log(module_id, created_at DESC);
CREATE INDEX idx_module_admin_audit_log_action ON public.module_admin_audit_log(action, created_at DESC);

GRANT SELECT, INSERT ON public.module_admin_audit_log TO authenticated;
GRANT ALL ON public.module_admin_audit_log TO service_role;

ALTER TABLE public.module_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view module audit log"
  ON public.module_admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated can insert module audit log"
  ON public.module_admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
