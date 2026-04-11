ALTER TABLE public.planning_pratique_config
ADD COLUMN IF NOT EXISTS day_time_slots jsonb NOT NULL DEFAULT '{}'::jsonb;