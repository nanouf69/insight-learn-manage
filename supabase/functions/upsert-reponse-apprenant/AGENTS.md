# upsert-reponse-apprenant
- Re-apply a skipped (stale base) question only when the sent value equals that account's latest journaled click (client time, then arrival) and treats skipped keys equal to the stored value as resolved; never for closures, revisionState or v3 lots; why: lost acknowledgements froze multi-answer quizzes while older-device replays must stay ignored.
