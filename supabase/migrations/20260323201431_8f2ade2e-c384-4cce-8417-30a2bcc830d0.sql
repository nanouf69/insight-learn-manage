UPDATE apprenant_quiz_results
SET details = details - 'correctionsIA',
    score_obtenu = 0
WHERE quiz_type = 'examen_blanc'
AND completed_at::date = CURRENT_DATE
AND details ? 'correctionsIA';