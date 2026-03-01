
-- Add auth_user_id to apprenants to link with auth accounts
ALTER TABLE public.apprenants ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- Add RLS policy for students to read their own apprenant record
CREATE POLICY "Students can view own apprenant"
ON public.apprenants
FOR SELECT
USING (auth.uid() = auth_user_id);
