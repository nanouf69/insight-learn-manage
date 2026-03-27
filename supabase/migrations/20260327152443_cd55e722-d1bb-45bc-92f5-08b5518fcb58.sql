-- Step 1: Delete duplicate rows, keeping the one with highest score_obtenu (or latest created_at)
DELETE FROM public.apprenant_quiz_results
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY apprenant_id, quiz_id, COALESCE(matiere_id, '')
        ORDER BY score_obtenu DESC NULLS LAST, created_at DESC
      ) as rn
    FROM public.apprenant_quiz_results
  ) ranked
  WHERE rn > 1
);

-- Step 2: Create unique index for upsert support
CREATE UNIQUE INDEX uq_apprenant_quiz_results_apprenant_quiz_matiere
ON public.apprenant_quiz_results (apprenant_id, quiz_id, COALESCE(matiere_id, ''));