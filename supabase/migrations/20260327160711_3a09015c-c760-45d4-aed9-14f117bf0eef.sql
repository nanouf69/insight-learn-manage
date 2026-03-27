
-- Drop the trigger that raises exceptions on duplicate inserts (already handled by UNIQUE constraint + upsert)
DROP TRIGGER IF EXISTS trg_prevent_duplicate_quiz_result_insert_for_learners ON public.apprenant_quiz_results;
