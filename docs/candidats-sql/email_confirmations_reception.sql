-- CANDIDAT — NON INSTALLÉ. Additif, aucune donnée existante modifiée.
CREATE TABLE public.email_confirmations_reception (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accuse_id uuid NOT NULL UNIQUE REFERENCES public.email_accuses(id),
  token_hash text NOT NULL UNIQUE,            -- seul le hachage SHA-256 est stocké
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  confirmed_at timestamptz                     -- horodatage serveur uniquement
);
GRANT SELECT ON public.email_confirmations_reception TO authenticated;
GRANT ALL ON public.email_confirmations_reception TO service_role;
ALTER TABLE public.email_confirmations_reception ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins lisent confirmations" ON public.email_confirmations_reception
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Anti-rejeu / immuabilité : confirmed_at ne passe qu'une fois de NULL à une date.
CREATE OR REPLACE FUNCTION public.garde_confirmation_reception() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'suppression interdite' USING ERRCODE='42501'; END IF;
  IF OLD.confirmed_at IS NOT NULL
     OR NEW.token_hash <> OLD.token_hash OR NEW.accuse_id <> OLD.accuse_id
     OR NEW.expires_at <> OLD.expires_at OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'confirmation immuable' USING ERRCODE='42501';
  END IF;
  NEW.confirmed_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_garde_confirmation_reception BEFORE UPDATE OR DELETE
  ON public.email_confirmations_reception FOR EACH ROW EXECUTE FUNCTION public.garde_confirmation_reception();
