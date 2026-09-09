CREATE TABLE IF NOT EXISTS public.apprenant_identifiants_t3p (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL UNIQUE REFERENCES public.apprenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  nouvel_email text,
  nouveau_mot_de_passe text,
  recu_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apprenant_identifiants_t3p TO authenticated;
GRANT ALL ON public.apprenant_identifiants_t3p TO service_role;

ALTER TABLE public.apprenant_identifiants_t3p ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM users manage T3P credentials"
ON public.apprenant_identifiants_t3p
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_updated_at_apprenant_identifiants_t3p
BEFORE UPDATE ON public.apprenant_identifiants_t3p
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();