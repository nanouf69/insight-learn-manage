ALTER TABLE public.factures ADD COLUMN lignes_apprenants jsonb NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.factures.lignes_apprenants IS 'Lignes nominatives figées des nouvelles factures communes, distinctes des factures individuelles et de leurs paiements.';

CREATE FUNCTION public.garde_facture_commune() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_total numeric; v_nombre integer; v_uniques integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.lignes_apprenants <> '[]'::jsonb AND NEW.lignes_apprenants IS DISTINCT FROM OLD.lignes_apprenants THEN
    RAISE EXCEPTION 'Les lignes de la facture commune sont figées.' USING ERRCODE = '23514';
  END IF;
  IF NEW.lignes_apprenants = '[]'::jsonb THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.lignes_apprenants) <> 'array' THEN RAISE EXCEPTION 'Lignes invalides.' USING ERRCODE = '23514'; END IF;
  SELECT count(*), count(DISTINCT l->>'apprenant_id'), sum((l->>'montant_ht')::numeric) INTO v_nombre, v_uniques, v_total FROM jsonb_array_elements(NEW.lignes_apprenants) l;
  IF v_nombre < 2 OR v_nombre <> v_uniques OR NEW.apprenant_id IS NOT NULL OR NEW.montant_ht <> v_total OR NEW.montant_ttc <> v_total OR NEW.montant_tva <> 0 OR NEW.tva_taux <> 0 THEN
    RAISE EXCEPTION 'Facture commune : apprenants distincts, total exact et TVA exonérée requis.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.lignes_apprenants) l WHERE (l->>'montant_ht') IS NULL OR (l->>'montant_ht')::numeric <= 0 OR round((l->>'montant_ht')::numeric, 2) <> (l->>'montant_ht')::numeric OR nullif(l->>'stagiaire','') IS NULL OR nullif(l->>'designation','') IS NULL OR NOT EXISTS (SELECT 1 FROM public.session_apprenants sa WHERE sa.session_id = NEW.session_id AND sa.apprenant_id = (l->>'apprenant_id')::uuid)) THEN
    RAISE EXCEPTION 'Une ligne est invalide ou ne correspond pas à la session.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_garde_facture_commune BEFORE INSERT OR UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION public.garde_facture_commune();

CREATE FUNCTION public.creer_facture_commune_fc(_id uuid, _session_id uuid, _payeur_apprenant_id uuid, _lignes jsonb, _confirmer_factures_existantes boolean DEFAULT false) RETURNS public.factures LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_facture public.factures; v_lignes jsonb; v_ids uuid[]; v_fin public.financeurs_fc; v_payeur public.apprenants; v_total numeric; v_prefix text; v_numero text; v_next integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès administrateur requis.' USING ERRCODE = '42501'; END IF;
  IF _id IS NULL OR _session_id IS NULL OR _payeur_apprenant_id IS NULL OR jsonb_typeof(_lignes) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Demande invalide.' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('facture_commune_fc'));
  SELECT * INTO v_facture FROM public.factures WHERE id = _id;
  IF FOUND THEN
    IF v_facture.session_id <> _session_id OR v_facture.lignes_apprenants = '[]'::jsonb THEN RAISE EXCEPTION 'Identité de facture déjà utilisée.' USING ERRCODE = '23505'; END IF;
    RETURN v_facture;
  END IF;
  IF jsonb_array_length(_lignes) < 2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(_lignes) l WHERE (l->>'montant_ht') IS NULL OR (l->>'montant_ht')::numeric <= 0 OR round((l->>'montant_ht')::numeric,2) <> (l->>'montant_ht')::numeric OR (l->>'apprenant_id') IS NULL) THEN RAISE EXCEPTION 'Au moins deux apprenants avec des montants positifs sont requis.' USING ERRCODE = '22023'; END IF;
  SELECT array_agg((l->>'apprenant_id')::uuid) INTO v_ids FROM jsonb_array_elements(_lignes) l;
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) x) <> cardinality(v_ids) OR NOT (_payeur_apprenant_id = ANY(v_ids)) THEN RAISE EXCEPTION 'Apprenants distincts et destinataire sélectionné requis.' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_ids) x WHERE NOT EXISTS (SELECT 1 FROM public.session_apprenants sa WHERE sa.session_id = _session_id AND sa.apprenant_id = x)) THEN RAISE EXCEPTION 'Un apprenant ne fait pas partie de cette session.' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.factures f WHERE f.session_id = _session_id AND (f.apprenant_id = ANY(v_ids) OR EXISTS (SELECT 1 FROM jsonb_array_elements(f.lignes_apprenants) l WHERE (l->>'apprenant_id')::uuid = ANY(v_ids)))) AND NOT coalesce(_confirmer_factures_existantes,false) THEN RAISE EXCEPTION 'Des factures existent déjà : confirmez la création supplémentaire sans remplacement.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO STRICT v_payeur FROM public.apprenants WHERE id = _payeur_apprenant_id;
  SELECT * INTO v_fin FROM public.financeurs_fc WHERE apprenant_id = _payeur_apprenant_id ORDER BY created_at DESC LIMIT 1;
  IF v_fin.type_financeur = 'professionnel' AND nullif(trim(v_fin.raison_sociale),'') IS NULL THEN RAISE EXCEPTION 'Raison sociale du destinataire manquante.' USING ERRCODE = '22023'; END IF;
  SELECT jsonb_agg(jsonb_build_object('apprenant_id', a.id, 'stagiaire', concat_ws(' ',a.prenom,upper(a.nom)), 'designation', CASE WHEN upper(coalesce(a.type_apprenant,'') || ' ' || coalesce(a.formation_choisie,'')) LIKE '%TAXI%' THEN 'Formation Continue Obligatoire TAXI - 14h' ELSE 'Formation Continue Obligatoire VTC - 14h' END, 'montant_ht', (l->>'montant_ht')::numeric) ORDER BY ord), sum((l->>'montant_ht')::numeric) INTO v_lignes, v_total FROM jsonb_array_elements(_lignes) WITH ORDINALITY src(l,ord) JOIN public.apprenants a ON a.id = (l->>'apprenant_id')::uuid;
  v_prefix := to_char(now() AT TIME ZONE 'Europe/Paris','YYYYMMDD');
  SELECT coalesce(max(substring(numero FROM 9)::integer),0)+1 INTO v_next FROM public.factures WHERE numero ~ ('^' || v_prefix || '[0-9]{3,}$');
  v_numero := v_prefix || lpad(v_next::text,greatest(3,length(v_next::text)), '0');
  INSERT INTO public.factures(id,numero,session_id,apprenant_id,type_financement,client_nom,client_adresse,client_siret,date_emission,date_echeance,montant_ht,tva_taux,montant_tva,montant_ttc,statut,lignes_apprenants) VALUES (_id,v_numero,_session_id,NULL,CASE WHEN v_fin.type_financeur = 'professionnel' THEN 'professionnel' ELSE 'particulier' END,CASE WHEN v_fin.type_financeur = 'professionnel' THEN v_fin.raison_sociale ELSE concat_ws(' ',v_payeur.prenom,upper(v_payeur.nom)) END,concat_ws(', ',coalesce(v_fin.adresse,v_payeur.adresse),nullif(concat_ws(' ',coalesce(v_fin.code_postal,v_payeur.code_postal),coalesce(v_fin.ville,v_payeur.ville)),'')),coalesce(v_fin.siret,v_fin.siren),(now() AT TIME ZONE 'Europe/Paris')::date,(now() AT TIME ZONE 'Europe/Paris')::date + 30,v_total,0,0,v_total,'brouillon',v_lignes) RETURNING * INTO v_facture;
  RETURN v_facture;
END $$;
REVOKE ALL ON FUNCTION public.creer_facture_commune_fc(uuid,uuid,uuid,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_facture_commune_fc(uuid,uuid,uuid,jsonb,boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.garde_facture_commune() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.garde_facture_commune() TO authenticated, service_role;