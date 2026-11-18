CREATE TABLE public.demandes_coordonnees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  apprenant_id uuid NOT NULL,
  session_id uuid,
  champs text[] NOT NULL DEFAULT '{}',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  repondu_at timestamptz,
  reponse jsonb
);
GRANT SELECT, INSERT ON public.demandes_coordonnees TO authenticated;
GRANT ALL ON public.demandes_coordonnees TO service_role;
ALTER TABLE public.demandes_coordonnees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent demandes coordonnees" ON public.demandes_coordonnees FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins creent demandes coordonnees" ON public.demandes_coordonnees FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));