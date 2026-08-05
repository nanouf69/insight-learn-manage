UPDATE public.apprenant_connexions c
SET ended_at = least(
      coalesce(c.ended_at, c.last_seen_at, c.started_at),
      c.started_at + interval '7 hours',
      coalesce(greatest(c.last_action_at, c.last_seen_at), c.started_at) + interval '30 minutes'
    )
WHERE least(
      coalesce(c.ended_at, c.last_seen_at, c.started_at),
      c.started_at + interval '7 hours',
      coalesce(greatest(c.last_action_at, c.last_seen_at), c.started_at) + interval '30 minutes'
    ) < coalesce(c.ended_at, c.last_seen_at, c.started_at) - interval '1 minute';