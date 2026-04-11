ALTER TABLE public.planning_pratique_config
ADD COLUMN IF NOT EXISTS max_per_day_map jsonb NOT NULL DEFAULT '{}'::jsonb;