DROP POLICY IF EXISTS "Mise a jour des reponses authentifiee" ON public.answer_state;
CREATE POLICY "Mise a jour des reponses proprietaire ou admin" ON public.answer_state
  FOR UPDATE TO authenticated
  USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Ecriture des reponses authentifiee" ON public.answer_state;
CREATE POLICY "Ecriture des reponses proprietaire ou admin" ON public.answer_state
  FOR INSERT TO authenticated
  WITH CHECK (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Cloture de tentative authentifiee" ON public.exam_attempts_v2;
CREATE POLICY "Cloture de tentative proprietaire ou admin" ON public.exam_attempts_v2
  FOR UPDATE TO authenticated
  USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Creation de tentative authentifiee" ON public.exam_attempts_v2;
CREATE POLICY "Creation de tentative proprietaire ou admin" ON public.exam_attempts_v2
  FOR INSERT TO authenticated
  WITH CHECK (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Lecture du journal d audit" ON public.audit_journal;
CREATE POLICY "Lecture du journal d audit admin" ON public.audit_journal
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated can read exam audit log" ON public.examens_blancs_audit_log;
CREATE POLICY "Admin lit le journal examens blancs" ON public.examens_blancs_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated can write exam audit log" ON public.examens_blancs_audit_log;
CREATE POLICY "Admin ecrit le journal examens blancs" ON public.examens_blancs_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND author_user_id = auth.uid());

DROP POLICY IF EXISTS "qrc_correction_events lecture authentifiee" ON public.qrc_correction_events;
CREATE POLICY "qrc_correction_events lecture proprietaire ou admin" ON public.qrc_correction_events
  FOR SELECT TO authenticated
  USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Lecture des autorisations par les utilisateurs connectés" ON public.exam_retake_authorizations;
CREATE POLICY "Lecture des autorisations proprietaire ou admin" ON public.exam_retake_authorizations
  FOR SELECT TO authenticated
  USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "core_operations lecture authentifiee" ON public.core_operations;
CREATE POLICY "core_operations lecture admin" ON public.core_operations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Lecture neutralisations authentifies" ON public.core_tentatives_neutralisees;
CREATE POLICY "Lecture neutralisations proprietaire ou admin" ON public.core_tentatives_neutralisees
  FOR SELECT TO authenticated
  USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.core_sujet_publie(p_exam_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.exam_content_versions
    WHERE exam_id = p_exam_id AND statut = 'publiee' AND retired_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.core_sujet_publie(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.core_sujet_publie(text) TO authenticated, service_role;
DROP POLICY IF EXISTS "Lecture des versions par utilisateurs authentifies" ON public.exam_content_versions;
CREATE POLICY "Lecture des versions admin" ON public.exam_content_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Lecture des partages declares" ON public.exam_content_shares;
CREATE POLICY "Lecture des partages admin" ON public.exam_content_shares
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Lecture des comptes test du pont" ON public.core_bridge_comptes_test;
CREATE POLICY "Lecture des comptes test du pont admin" ON public.core_bridge_comptes_test
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Lecture des drapeaux du pont" ON public.core_bridge_flags;
CREATE POLICY "Lecture des drapeaux du pont admin" ON public.core_bridge_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "live_participants admin all" ON public.live_participants;
DROP POLICY IF EXISTS "live_participants public read" ON public.live_participants;
CREATE POLICY "live_participants admin" ON public.live_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "live_responses admin all" ON public.live_responses;
DROP POLICY IF EXISTS "live_responses public read" ON public.live_responses;
CREATE POLICY "live_responses admin" ON public.live_responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "live_sessions admin all" ON public.live_sessions;
DROP POLICY IF EXISTS "live_sessions public read" ON public.live_sessions;
CREATE POLICY "live_sessions admin" ON public.live_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));