CREATE TABLE public.devis_envoi_destinataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_envoi_id uuid NOT NULL REFERENCES public.devis_envois(id),
  apprenant_id uuid,
  reference text,
  role text NOT NULL CHECK (role IN ('stagiaire','financeur','stagiaire_financeur')),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','envoye','echec')),
  erreur text,
  tentatives integer NOT NULL DEFAULT 1,
  envoye_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (devis_envoi_id, email)
);
GRANT SELECT, INSERT, UPDATE ON public.devis_envoi_destinataires TO authenticated;
GRANT ALL ON public.devis_envoi_destinataires TO service_role;
ALTER TABLE public.devis_envoi_destinataires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent journal devis" ON public.devis_envoi_destinataires FOR SELECT TO authenticated USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));
CREATE POLICY "Admins ajoutent journal devis" ON public.devis_envoi_destinataires FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));
CREATE POLICY "Admins mettent a jour journal devis" ON public.devis_envoi_destinataires FOR UPDATE TO authenticated USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'))) WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));
-- Un envoi déjà confirmé ne repasse jamais en échec/en cours.
CREATE FUNCTION public.devis_destinataire_garde() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.statut = 'envoye' AND NEW.statut <> 'envoye' THEN
    RAISE EXCEPTION 'Envoi déjà confirmé pour ce destinataire' USING ERRCODE = 'P0550';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_devis_destinataire_garde BEFORE UPDATE ON public.devis_envoi_destinataires FOR EACH ROW EXECUTE FUNCTION public.devis_destinataire_garde();