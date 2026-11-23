-- Non-destructive: data, exam snapshots, signatures and service workflows are unchanged.
ALTER POLICY "Creation de QRC authentifiee" ON public.qrc_instances_v2
  WITH CHECK (public.core_est_proprietaire(apprenant_id)
    AND etat = 'en_attente' AND note IS NULL
    AND corrige_par IS NULL AND corrige_email IS NULL AND corrige_at IS NULL);
REVOKE ALL ON public.qrc_instances_v2 FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.qrc_instances_v2 FROM authenticated;
GRANT INSERT (attempt_id, question_id, apprenant_id, reponse) ON public.qrc_instances_v2 TO authenticated;

DROP POLICY "Ajout au journal d audit" ON public.audit_journal;
REVOKE ALL ON public.audit_journal FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.audit_journal FROM authenticated;

-- Client reports are admin-only refusals, never authoritative accepted writes.
ALTER POLICY "Utilisateurs authentifies journalisent les refus" ON public.exam_content_write_log
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
    AND author_user_id = auth.uid() AND statut = 'refuse'
    AND action = 'ecriture_contenu'
    AND author_email IS NULL AND exam_id IS NULL AND matiere_id IS NULL
    AND questions_avant IS NULL AND questions_apres IS NULL
    AND signature_avant IS NULL AND signature_apres IS NULL
    AND examen_source_suspecte IS NULL AND details IS NULL);
REVOKE ALL ON public.exam_content_write_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exam_content_write_log FROM authenticated;
GRANT INSERT (module_id, action, origine, statut, motif_refus, editor_schema_version)
  ON public.exam_content_write_log TO authenticated;

-- Old clients require only enabled quiz identifiers; internal notes are not client data.
ALTER POLICY "Lecture des drapeaux QRC" ON public.qrc_engine_flags
  USING (enabled = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.qrc_engine_flags FROM anon, authenticated;
GRANT SELECT (quiz_id, enabled) ON public.qrc_engine_flags TO authenticated;

-- The only client consumer runs after admin authentication; public access is unnecessary.
DROP POLICY "Anyone can read app_version" ON public.app_version;
REVOKE ALL ON public.app_version FROM anon;

GRANT ALL ON public.qrc_instances_v2, public.audit_journal, public.exam_content_write_log,
  public.qrc_engine_flags, public.app_version TO service_role;