ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS type_prestation text;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS client_email text;

CREATE TABLE public.facture_revisions (
  id uuid PRIMARY KEY,
  facture_id uuid NOT NULL REFERENCES public.factures(id),
  avant jsonb NOT NULL,
  apres jsonb NOT NULL,
  destinataire text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  statut_envoi text NOT NULL DEFAULT 'a_envoyer' CHECK (statut_envoi IN ('a_envoyer','en_cours','envoye','echec','indetermine','sans_envoi')),
  envoi_le timestamptz,
  erreur text,
  message_id text,
  pdf_path text
);
GRANT SELECT ON public.facture_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.facture_revisions TO service_role;
ALTER TABLE public.facture_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY facture_revisions_admin ON public.facture_revisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX facture_revisions_facture_date ON public.facture_revisions(facture_id, created_at DESC);

CREATE FUNCTION public.facture_revision_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Les versions des factures sont conservées.'; END IF;
  IF (to_jsonb(NEW) - ARRAY['statut_envoi','envoi_le','erreur','message_id','pdf_path']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['statut_envoi','envoi_le','erreur','message_id','pdf_path']) THEN
    RAISE EXCEPTION 'Les versions des factures sont conservées.';
  END IF;
  IF OLD.statut_envoi IN ('envoye','indetermine','echec','sans_envoi') AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Résultat d’envoi déjà enregistré, ne pas renvoyer.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER facture_revision_immuable BEFORE UPDATE OR DELETE ON public.facture_revisions FOR EACH ROW EXECUTE FUNCTION public.facture_revision_immuable();
REVOKE ALL ON FUNCTION public.facture_revision_immuable() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.facture_modifier_version(_id uuid, _operation uuid, _expected timestamptz, _patch jsonb, _email text)
RETURNS public.facture_revisions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.factures; r public.facture_revisions; nouveau public.factures; ht numeric; taux numeric; prestation text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Modification réservée aux administrateurs.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO f FROM public.factures WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable.'; END IF;
  SELECT * INTO r FROM public.facture_revisions WHERE id=_operation;
  IF FOUND THEN
    IF r.facture_id<>_id OR r.created_by<>auth.uid() OR r.destinataire<>trim(_email) OR NOT (r.apres @> _patch) THEN
      RAISE EXCEPTION 'Opération déjà utilisée pour une autre modification.';
    END IF;
    RETURN r;
  END IF;
  IF _expected IS NULL OR f.updated_at IS DISTINCT FROM _expected THEN
    RAISE EXCEPTION 'La facture a changé. Fermez puis rouvrez-la avant de modifier.' USING ERRCODE='40001';
  END IF;
  IF jsonb_typeof(_patch) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(_patch) k WHERE k NOT IN ('numero','client_nom','type_financement','montant_ht','tva_taux','montant_tva','montant_ttc','statut','date_emission','date_echeance','date_paiement','numero_engagement','numero_convention','apprenant_id','type_prestation')
  ) THEN RAISE EXCEPTION 'Champs de modification non autorisés.'; END IF;
  IF trim(coalesce(_email,'')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Confirmez l’adresse email du destinataire de la facture.'; END IF;
  prestation:=_patch->>'type_prestation';
  IF prestation IS NOT NULL AND prestation NOT IN ('Formation VTC','Formation VTC e-learning','Formation TAXI','Formation TAXI e-learning','Formation TAXI passerelle','Formation VTC passerelle','Formation continue TAXI','Formation continue VTC','Formation mobilité TAXI') THEN RAISE EXCEPTION 'Type de prestation non autorisé.'; END IF;
  nouveau:=jsonb_populate_record(f,_patch);
  IF trim(coalesce(nouveau.numero,''))='' OR trim(coalesce(nouveau.client_nom,''))='' OR nouveau.date_emission IS NULL THEN RAISE EXCEPTION 'Numéro, client et date d’émission obligatoires.'; END IF;
  IF nouveau.statut NOT IN ('brouillon','en_attente','payee','en_retard','annulee') OR nouveau.statut IS NULL THEN RAISE EXCEPTION 'Statut non autorisé.'; END IF;
  IF f.statut IS DISTINCT FROM 'brouillon' AND nouveau.statut='brouillon' THEN RAISE EXCEPTION 'Une facture émise ne peut pas redevenir un brouillon.'; END IF;
  IF nouveau.apprenant_id IS DISTINCT FROM f.apprenant_id THEN RAISE EXCEPTION 'L’apprenant initial doit être conservé. Utilisez les rattachements supplémentaires.'; END IF;
  ht:=nouveau.montant_ht; taux:=nouveau.tva_taux;
  IF ht IS NULL OR taux IS NULL OR ht::text IN ('NaN','Infinity','-Infinity') OR taux NOT IN (0,10,20) THEN RAISE EXCEPTION 'Montant ou taux invalide.'; END IF;
  IF jsonb_array_length(coalesce(f.lignes_apprenants,'[]'))>0 AND (ht IS DISTINCT FROM f.montant_ht OR taux IS DISTINCT FROM f.tva_taux) THEN RAISE EXCEPTION 'Montants de la facture commune conservés.'; END IF;
  nouveau.montant_tva:=round(ht*taux/100,2); nouveau.montant_ttc:=round(ht+nouveau.montant_tva,2);
  UPDATE public.factures SET numero=nouveau.numero, client_nom=nouveau.client_nom, type_financement=nouveau.type_financement,
    montant_ht=ht, tva_taux=taux, montant_tva=nouveau.montant_tva, montant_ttc=nouveau.montant_ttc, statut=nouveau.statut,
    date_emission=nouveau.date_emission, date_echeance=nouveau.date_echeance, date_paiement=nouveau.date_paiement,
    numero_engagement=nouveau.numero_engagement, numero_convention=nouveau.numero_convention,
    type_prestation=prestation, client_email=trim(_email), updated_at=clock_timestamp()
    WHERE id=_id RETURNING * INTO nouveau;
  INSERT INTO public.facture_revisions(id,facture_id,avant,apres,destinataire,created_by,statut_envoi)
    VALUES(_operation,_id,to_jsonb(f),to_jsonb(nouveau),trim(_email),auth.uid(),CASE WHEN nouveau.statut='brouillon' THEN 'sans_envoi' ELSE 'a_envoyer' END)
    RETURNING * INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.facture_modifier_version(uuid,uuid,timestamptz,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.facture_modifier_version(uuid,uuid,timestamptz,jsonb,text) TO authenticated;

CREATE POLICY facture_revisions_pdf_admin ON storage.objects FOR SELECT TO authenticated USING (bucket_id='factures-revisions' AND public.has_role(auth.uid(),'admin'));