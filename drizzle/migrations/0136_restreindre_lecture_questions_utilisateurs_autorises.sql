CREATE OR REPLACE FUNCTION public.peut_lire_contenu_pedagogique(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.has_role(_uid, 'admin'::app_role)
    OR public.has_role(_uid, 'moderator'::app_role)
    OR EXISTS (SELECT 1 FROM public.apprenants a WHERE a.auth_user_id = _uid AND a.deleted_at IS NULL)
  )
$$;
REVOKE ALL ON FUNCTION public.peut_lire_contenu_pedagogique(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peut_lire_contenu_pedagogique(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can read canonical quiz questions" ON public.quiz_questions;
CREATE POLICY "Lecture questions par admin ou apprenant inscrit" ON public.quiz_questions
  FOR SELECT TO authenticated USING (public.peut_lire_contenu_pedagogique(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read canonical quiz sets" ON public.quiz_question_sets;
CREATE POLICY "Lecture quiz sets par admin ou apprenant inscrit" ON public.quiz_question_sets
  FOR SELECT TO authenticated USING (public.peut_lire_contenu_pedagogique(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read canonical quiz bindings" ON public.quiz_question_bindings;
CREATE POLICY "Lecture bindings par admin ou apprenant inscrit" ON public.quiz_question_bindings
  FOR SELECT TO authenticated USING (public.peut_lire_contenu_pedagogique(auth.uid()));

DROP POLICY IF EXISTS "Lecture parcours examens blancs" ON public.examens_blancs_parcours;
CREATE POLICY "Lecture parcours EB par admin ou apprenant inscrit" ON public.examens_blancs_parcours
  FOR SELECT TO authenticated USING (public.peut_lire_contenu_pedagogique(auth.uid()));