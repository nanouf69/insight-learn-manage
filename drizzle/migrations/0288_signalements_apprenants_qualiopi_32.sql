CREATE TABLE public.signalements_apprenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('bug','remarque')),
  apprenant_nom text,
  apprenant_email text,
  explication text NOT NULL,
  captures jsonb NOT NULL DEFAULT '[]'::jsonb,
  envoi_statut text NOT NULL DEFAULT 'en_attente' CHECK (envoi_statut IN ('en_attente','envoye','echec')),
  envoi_erreur text,
  envoi_le timestamptz,
  pieces_jointes boolean,
  qualiopi_preuve_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signalements_apprenants TO authenticated;
GRANT ALL ON public.signalements_apprenants TO service_role;
ALTER TABLE public.signalements_apprenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les signalements" ON public.signalements_apprenants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.signalements_apprenants_garde()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Suppression interdite des signalements' USING ERRCODE = '42501'; END IF;
  IF NEW.type IS DISTINCT FROM OLD.type OR NEW.explication IS DISTINCT FROM OLD.explication
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id OR NEW.captures IS DISTINCT FROM OLD.captures
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Contenu du signalement immuable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_signalements_apprenants_garde BEFORE UPDATE OR DELETE ON public.signalements_apprenants
  FOR EACH ROW EXECUTE FUNCTION public.signalements_apprenants_garde();
CREATE UNIQUE INDEX IF NOT EXISTS qualiopi_preuves_signalement_unique
  ON public.qualiopi_preuves (source_table, source_id) WHERE source_table = 'signalements_apprenants';