-- Ensure RLS is enabled on target learner answer tables
ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprenant_module_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprenant_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprenant_documents_completes ENABLE ROW LEVEL SECURITY;

-- Reusable ownership check: supports both direct apprenant_id=auth.uid() and mapped apprenant row
CREATE OR REPLACE FUNCTION public.is_current_user_apprenant(_apprenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _apprenant_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.apprenants a
      WHERE a.id = _apprenant_id
        AND a.auth_user_id = auth.uid()
    )
  );
$$;

-- =========================================================
-- reponses_apprenants
-- =========================================================
DROP POLICY IF EXISTS "Students can select own reponses" ON public.reponses_apprenants;
DROP POLICY IF EXISTS "Students can insert own reponses" ON public.reponses_apprenants;
DROP POLICY IF EXISTS "Students can update own reponses" ON public.reponses_apprenants;

CREATE POLICY "Learner can select own reponses"
ON public.reponses_apprenants
FOR SELECT
TO authenticated
USING (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

CREATE POLICY "Learner can insert own reponses"
ON public.reponses_apprenants
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

CREATE POLICY "Learner can update own reponses"
ON public.reponses_apprenants
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
)
WITH CHECK (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Service role can select reponses_apprenants" ON public.reponses_apprenants;
CREATE POLICY "Service role can select reponses_apprenants"
ON public.reponses_apprenants
FOR SELECT
TO service_role
USING (true);

-- =========================================================
-- apprenant_module_completion
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read their own completions" ON public.apprenant_module_completion;
DROP POLICY IF EXISTS "Authenticated users can insert their own completions" ON public.apprenant_module_completion;
DROP POLICY IF EXISTS "Authenticated users can update their own completions" ON public.apprenant_module_completion;

CREATE POLICY "Learner can select own completions"
ON public.apprenant_module_completion
FOR SELECT
TO authenticated
USING (public.is_current_user_apprenant(apprenant_id));

CREATE POLICY "Learner can insert own completions"
ON public.apprenant_module_completion
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_apprenant(apprenant_id));

CREATE POLICY "Learner can update own completions"
ON public.apprenant_module_completion
FOR UPDATE
TO authenticated
USING (public.is_current_user_apprenant(apprenant_id))
WITH CHECK (public.is_current_user_apprenant(apprenant_id));

DROP POLICY IF EXISTS "Service role can select apprenant_module_completion" ON public.apprenant_module_completion;
CREATE POLICY "Service role can select apprenant_module_completion"
ON public.apprenant_module_completion
FOR SELECT
TO service_role
USING (true);

-- =========================================================
-- apprenant_quiz_results
-- =========================================================
DROP POLICY IF EXISTS "Students can select own quiz results" ON public.apprenant_quiz_results;
DROP POLICY IF EXISTS "Students can insert own quiz results" ON public.apprenant_quiz_results;
DROP POLICY IF EXISTS "Learner can update own quiz results" ON public.apprenant_quiz_results;

CREATE POLICY "Learner can select own quiz results"
ON public.apprenant_quiz_results
FOR SELECT
TO authenticated
USING (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

CREATE POLICY "Learner can insert own quiz results"
ON public.apprenant_quiz_results
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

CREATE POLICY "Learner can update own quiz results"
ON public.apprenant_quiz_results
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
)
WITH CHECK (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Service role can select apprenant_quiz_results" ON public.apprenant_quiz_results;
CREATE POLICY "Service role can select apprenant_quiz_results"
ON public.apprenant_quiz_results
FOR SELECT
TO service_role
USING (true);

-- =========================================================
-- apprenant_documents_completes
-- =========================================================
DROP POLICY IF EXISTS "Students can select own documents_completes" ON public.apprenant_documents_completes;
DROP POLICY IF EXISTS "Students can insert own documents_completes" ON public.apprenant_documents_completes;
DROP POLICY IF EXISTS "Learner can update own documents_completes" ON public.apprenant_documents_completes;

CREATE POLICY "Learner can select own documents_completes"
ON public.apprenant_documents_completes
FOR SELECT
TO authenticated
USING (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

CREATE POLICY "Learner can insert own documents_completes"
ON public.apprenant_documents_completes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

CREATE POLICY "Learner can update own documents_completes"
ON public.apprenant_documents_completes
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
)
WITH CHECK (
  public.is_current_user_apprenant(apprenant_id)
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Service role can select apprenant_documents_completes" ON public.apprenant_documents_completes;
CREATE POLICY "Service role can select apprenant_documents_completes"
ON public.apprenant_documents_completes
FOR SELECT
TO service_role
USING (true);