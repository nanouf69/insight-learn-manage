GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_editor_state TO authenticated;
GRANT ALL ON public.module_editor_state TO service_role;

DROP POLICY IF EXISTS "Public can read module_editor_state" ON public.module_editor_state;
DROP POLICY IF EXISTS "Learners can read module_editor_state" ON public.module_editor_state;

CREATE POLICY "Learners can read module_editor_state"
  ON public.module_editor_state
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.apprenants a
      WHERE a.auth_user_id = auth.uid()
        AND a.deleted_at IS NULL
    )
  );