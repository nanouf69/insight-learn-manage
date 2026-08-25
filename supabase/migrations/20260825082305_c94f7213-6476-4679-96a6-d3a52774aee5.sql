GRANT SELECT ON public.sessions TO authenticated;
CREATE POLICY "Learners can view their own sessions"
ON public.sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.session_apprenants sa
  JOIN public.apprenants a ON a.id = sa.apprenant_id
  WHERE sa.session_id = sessions.id AND a.auth_user_id = auth.uid()
));