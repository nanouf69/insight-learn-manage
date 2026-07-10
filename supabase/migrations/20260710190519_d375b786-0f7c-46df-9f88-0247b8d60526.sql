-- Scaler score_obtenu quand il a été sauvé sur base 20 alors que score_max > 20 (barème pédagogique)
UPDATE public.apprenant_quiz_results
SET score_obtenu = LEAST(score_max, ROUND((score_obtenu::numeric * score_max / 20)::numeric, 2)),
    note_sur_20 = LEAST(20, ROUND(((LEAST(score_max, score_obtenu::numeric * score_max / 20)) / score_max) * 20, 2))
WHERE quiz_id ILIKE 'EB%'
  AND score_max > 20
  AND score_obtenu > 0
  AND score_obtenu <= 20
  AND matiere_id IN ('t3p','gestion','francais','reglementation_vtc','reglementation_vtc2','reglementation_taxi','reglementation_taxi2');