UPDATE public.apprenant_quiz_results
SET score_obtenu = score_obtenu * 2,
    score_max = score_max * 2,
    note_sur_20 = ROUND(((score_obtenu * 2)::numeric / (score_max * 2)) * 20, 2)
WHERE matiere_id IN ('reglementation_vtc','reglementation_taxi')
  AND score_max = 20
  AND quiz_id ILIKE 'EB%'
  AND EXISTS (SELECT 1); -- guard