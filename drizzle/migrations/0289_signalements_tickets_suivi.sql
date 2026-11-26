CREATE SEQUENCE IF NOT EXISTS public.signalements_reference_seq;
GRANT USAGE ON SEQUENCE public.signalements_reference_seq TO service_role;
ALTER TABLE public.signalements_apprenants
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'recu',
  ADD COLUMN IF NOT EXISTS statut_modifie_le timestamptz,
  ADD COLUMN IF NOT EXISTS statut_modifie_par uuid,
  ADD COLUMN IF NOT EXISTS qualiopi_indicateur integer NOT NULL DEFAULT 32;
UPDATE public.signalements_apprenants SET reference = 'SIG-' || to_char(created_at AT TIME ZONE 'Europe/Paris','YYYY') || '-' || lpad(nextval('public.signalements_reference_seq')::text, 6, '0') WHERE reference IS NULL;
ALTER TABLE public.signalements_apprenants ALTER COLUMN reference SET DEFAULT ('SIG-' || to_char(now() AT TIME ZONE 'Europe/Paris','YYYY') || '-' || lpad(nextval('public.signalements_reference_seq')::text, 6, '0'));
ALTER TABLE public.signalements_apprenants ALTER COLUMN reference SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS signalements_apprenants_reference_uq ON public.signalements_apprenants(reference);
ALTER TABLE public.signalements_apprenants ADD CONSTRAINT signalements_statut_chk CHECK (statut IN ('recu','en_cours','traite'));

CREATE OR REPLACE FUNCTION public.signalements_apprenants_garde()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Suppression interdite des signalements' USING ERRCODE = '42501'; END IF;
  IF NEW.type IS DISTINCT FROM OLD.type OR NEW.explication IS DISTINCT FROM OLD.explication
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id OR NEW.captures IS DISTINCT FROM OLD.captures
     OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.reference IS DISTINCT FROM OLD.reference
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR NEW.qualiopi_indicateur IS DISTINCT FROM OLD.qualiopi_indicateur THEN
    RAISE EXCEPTION 'Contenu du signalement immuable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP POLICY IF EXISTS "Apprenant lit ses signalements" ON public.signalements_apprenants;
CREATE POLICY "Apprenant lit ses signalements" ON public.signalements_apprenants
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

CREATE TABLE public.signalements_suivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES public.signalements_apprenants(id),
  nature text NOT NULL CHECK (nature IN ('creation','statut','analyse','reponse','mesure','note_interne')),
  contenu text,
  statut_avant text,
  statut_apres text,
  visible_apprenant boolean NOT NULL DEFAULT false,
  auteur_id uuid,
  auteur_nom text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signalements_suivi TO authenticated;
GRANT ALL ON public.signalements_suivi TO service_role;
ALTER TABLE public.signalements_suivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent le suivi" ON public.signalements_suivi FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Apprenant lit les reponses de ses tickets" ON public.signalements_suivi FOR SELECT TO authenticated
  USING (visible_apprenant AND EXISTS (SELECT 1 FROM public.signalements_apprenants s WHERE s.id = signalement_id AND s.auth_user_id = auth.uid()));
CREATE INDEX signalements_suivi_ticket_idx ON public.signalements_suivi(signalement_id, created_at);

CREATE OR REPLACE FUNCTION public.signalements_suivi_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Historique de suivi non modifiable' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER trg_signalements_suivi_append_only BEFORE UPDATE OR DELETE ON public.signalements_suivi
  FOR EACH ROW EXECUTE FUNCTION public.signalements_suivi_append_only();

CREATE OR REPLACE FUNCTION public.signalement_ajouter_suivi(_signalement_id uuid, _nature text, _contenu text, _nouveau_statut text, _visible_apprenant boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ancien text; v_nom text; v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501'; END IF;
  IF _nature NOT IN ('statut','analyse','reponse','mesure','note_interne') THEN RAISE EXCEPTION 'Nature invalide' USING ERRCODE = '22023'; END IF;
  IF _nouveau_statut IS NOT NULL AND _nouveau_statut NOT IN ('recu','en_cours','traite') THEN RAISE EXCEPTION 'Statut invalide' USING ERRCODE = '22023'; END IF;
  IF _nature <> 'statut' AND coalesce(btrim(_contenu),'') = '' THEN RAISE EXCEPTION 'Texte obligatoire' USING ERRCODE = '22023'; END IF;
  SELECT statut INTO v_ancien FROM public.signalements_apprenants WHERE id = _signalement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket introuvable' USING ERRCODE = 'P0002'; END IF;
  SELECT coalesce(nullif(btrim(coalesce(p.full_name,'')),''), u.email) INTO v_nom
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = v_uid;
  INSERT INTO public.signalements_suivi(signalement_id, nature, contenu, statut_avant, statut_apres, visible_apprenant, auteur_id, auteur_nom)
  VALUES (_signalement_id, _nature, nullif(btrim(coalesce(_contenu,'')),''), v_ancien,
          coalesce(_nouveau_statut, v_ancien), CASE WHEN _nature = 'note_interne' THEN false ELSE coalesce(_visible_apprenant,false) END, v_uid, v_nom)
  RETURNING id INTO v_id;
  IF _nouveau_statut IS NOT NULL AND _nouveau_statut <> v_ancien THEN
    UPDATE public.signalements_apprenants SET statut = _nouveau_statut, statut_modifie_le = now(), statut_modifie_par = v_uid WHERE id = _signalement_id;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.signalement_ajouter_suivi(uuid,text,text,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.signalement_ajouter_suivi(uuid,text,text,text,boolean) TO authenticated;