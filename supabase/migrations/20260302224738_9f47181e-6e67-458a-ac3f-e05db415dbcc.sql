
ALTER TABLE public.apprenant_module_completion
ADD COLUMN IF NOT EXISTS score_obtenu integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_max integer DEFAULT NULL;
