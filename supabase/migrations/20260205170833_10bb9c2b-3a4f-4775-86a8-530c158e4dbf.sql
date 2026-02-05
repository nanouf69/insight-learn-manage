-- Add types_apprenant and creneaux columns to sessions table
ALTER TABLE public.sessions 
ADD COLUMN types_apprenant text[] DEFAULT '{}',
ADD COLUMN creneaux text[] DEFAULT '{}';