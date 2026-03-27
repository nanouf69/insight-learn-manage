-- Re-create the missing UPDATE policy for learners on apprenant_quiz_results
-- This was dropped by a subsequent migration and never re-created,
-- causing upsert to fail silently (RLS blocks the UPDATE part)

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