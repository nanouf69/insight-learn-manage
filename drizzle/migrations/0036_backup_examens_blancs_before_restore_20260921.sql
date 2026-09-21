CREATE TABLE IF NOT EXISTS public.exam_content_backup_20260921 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_at timestamptz NOT NULL DEFAULT now(),
  module_id integer NOT NULL,
  module_data jsonb NOT NULL,
  deleted_cours jsonb,
  deleted_exercices jsonb,
  source_fingerprint text,
  updated_at timestamptz
);

COMMENT ON TABLE public.exam_content_backup_20260921 IS 'Sauvegarde intégrale du contenu des 28 examens blancs (module_editor_state 90000-90027) avant la restauration du 21/09/2026. Permet un retour arrière complet.';

GRANT SELECT ON public.exam_content_backup_20260921 TO authenticated;
GRANT ALL ON public.exam_content_backup_20260921 TO service_role;

ALTER TABLE public.exam_content_backup_20260921 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read exam content backup"
ON public.exam_content_backup_20260921
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.exam_content_backup_20260921 (module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at)
SELECT module_id, module_data, deleted_cours, deleted_exercices, source_fingerprint, updated_at
FROM public.module_editor_state
WHERE module_id BETWEEN 90000 AND 90027;