-- 1) Dédupliquer les résultats existants pour éviter l'échec de la contrainte UNIQUE
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY apprenant_id, quiz_id, matiere_id
      ORDER BY
        CASE WHEN COALESCE(score_obtenu, 0) > 0 THEN 1 ELSE 0 END DESC,
        COALESCE(score_obtenu, 0) DESC,
        COALESCE(note_sur_20, 0) DESC,
        completed_at DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.apprenant_quiz_results
)
DELETE FROM public.apprenant_quiz_results q
USING ranked r
WHERE q.id = r.id
  AND r.rn > 1;

-- 2) Ajouter la contrainte UNIQUE requise par l'upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_apprenant_quiz_matiere'
      AND conrelid = 'public.apprenant_quiz_results'::regclass
  ) THEN
    ALTER TABLE public.apprenant_quiz_results
      ADD CONSTRAINT unique_apprenant_quiz_matiere
      UNIQUE (apprenant_id, quiz_id, matiere_id);
  END IF;
END
$$;