CREATE TABLE public.sms_envois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  declencheur_type text NOT NULL,
  declencheur_user_id uuid,
  declencheur_email text,
  type_sms text,
  destinataire_masque text,
  destinataire_hash text,
  nb_destinataires integer NOT NULL DEFAULT 0,
  nb_caracteres integer,
  resultat text NOT NULL,
  detail text,
  ovh_ids jsonb
);
GRANT SELECT ON public.sms_envois TO authenticated;
GRANT ALL ON public.sms_envois TO service_role;
ALTER TABLE public.sms_envois ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent le journal SMS" ON public.sms_envois FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sms_envois_created_idx ON public.sms_envois (created_at);
CREATE INDEX sms_envois_hash_idx ON public.sms_envois (destinataire_hash, created_at);
CREATE INDEX sms_envois_user_idx ON public.sms_envois (declencheur_user_id, created_at);
CREATE TRIGGER sms_envois_append_only BEFORE UPDATE OR DELETE ON public.sms_envois FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();