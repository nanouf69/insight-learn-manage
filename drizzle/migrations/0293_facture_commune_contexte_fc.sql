CREATE FUNCTION public.controle_creation_facture_commune_fc() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.lignes_apprenants = '[]'::jsonb THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sessions s LEFT JOIN public.formations f ON f.id=s.formation_id WHERE s.id=NEW.session_id AND lower(coalesce(s.nom,'') || ' ' || coalesce(f.nom,'')) LIKE '%continue%') THEN RAISE EXCEPTION 'La facture commune est réservée à une session de formation continue.' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.lignes_apprenants) l LEFT JOIN public.apprenants a ON a.id=(l->>'apprenant_id')::uuid WHERE a.id IS NULL OR l->>'stagiaire' IS DISTINCT FROM concat_ws(' ',a.prenom,upper(a.nom))) THEN RAISE EXCEPTION 'Identité de stagiaire non conforme au dossier.' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_controle_creation_facture_commune_fc BEFORE INSERT ON public.factures FOR EACH ROW EXECUTE FUNCTION public.controle_creation_facture_commune_fc();
REVOKE ALL ON FUNCTION public.controle_creation_facture_commune_fc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.controle_creation_facture_commune_fc() TO authenticated, service_role;