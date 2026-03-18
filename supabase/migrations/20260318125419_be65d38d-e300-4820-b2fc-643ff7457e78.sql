UPDATE apprenant_connexions
SET ended_at = started_at + interval '7 hours',
    last_seen_at = CASE 
      WHEN last_seen_at > started_at + interval '7 hours' THEN started_at + interval '7 hours'
      ELSE last_seen_at
    END
WHERE ended_at IS NOT NULL
  AND (extract(epoch from (ended_at - started_at)) / 3600) > 7;

UPDATE apprenant_connexions
SET ended_at = started_at + interval '7 hours',
    last_seen_at = CASE 
      WHEN last_seen_at > started_at + interval '7 hours' THEN started_at + interval '7 hours'
      ELSE last_seen_at
    END
WHERE ended_at IS NULL
  AND (extract(epoch from (now() - started_at)) / 3600) > 7;