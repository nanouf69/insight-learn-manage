
-- 1) Add fallback INSERT policy on apprenant_quiz_results (doesn't require active connexion)
CREATE POLICY "Learner can insert quiz results without active session"
ON public.apprenant_quiz_results FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_quiz_results.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

-- 2) Add fallback UPDATE policy on apprenant_quiz_results
CREATE POLICY "Learner can update quiz results without active session"
ON public.apprenant_quiz_results FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_quiz_results.apprenant_id AND a.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_quiz_results.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

-- 3) Add fallback SELECT policy on apprenant_quiz_results
CREATE POLICY "Learner can select quiz results without active session"
ON public.apprenant_quiz_results FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = apprenant_quiz_results.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

-- 4) Replace the trigger to allow upserts (don't block ON CONFLICT updates)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_quiz_result_insert_for_learners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role and admins bypass
  IF COALESCE(auth.role(), '') = 'service_role' OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- For upserts (ON CONFLICT DO UPDATE), PostgreSQL routes through INSERT trigger first.
  -- We must allow the insert to proceed so ON CONFLICT can handle it.
  -- The unique constraint (apprenant_id, quiz_id, matiere_id) will handle deduplication.
  RETURN NEW;
END;
$function$;

-- 5) Also add fallback policies on reponses_apprenants for saving responses
CREATE POLICY "Learner can insert reponses without active session"
ON public.reponses_apprenants FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Learner can update reponses without active session"
ON public.reponses_apprenants FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Learner can select reponses without active session"
ON public.reponses_apprenants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = reponses_apprenants.apprenant_id AND a.auth_user_id = auth.uid()
  )
);
