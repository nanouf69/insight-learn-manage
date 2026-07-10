UPDATE public.apprenant_quiz_results
SET score_obtenu = score_obtenu * 2,
    note_sur_20 = ROUND(((score_obtenu * 2)::numeric / score_max) * 20, 2)
WHERE matiere_id IN ('reglementation_vtc','reglementation_taxi')
  AND score_max = 40
  AND quiz_id ILIKE 'EB%'
  AND score_obtenu <= 20;