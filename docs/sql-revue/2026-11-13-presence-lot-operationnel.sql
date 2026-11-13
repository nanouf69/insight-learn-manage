-- Lot présence opérationnel (13/11) : journal append-only des décisions, validation ciblée d'un créneau
-- avec justificatif PDF privé, annulation ciblée sans suppression. Aucune ligne existante modifiée.

CREATE TABLE public.presentiel_validation_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL UNIQUE,
 validation_id uuid NOT NULL REFERENCES public.presentiel_heures_validees(id),
 apprenant_id uuid NOT NULL,
 version integer NOT NULL CHECK(version > 0),
 action text NOT NULL CHECK(action IN ('annuler','restaurer')),
 motif text NOT NULL CHECK(length(btrim(motif)) BETWEEN 5 AND 500),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 original jsonb NOT NULL,
 UNIQUE(validation_id,version)
);
GRANT SELECT ON public.presentiel_validation_decisions TO authenticated;
GRANT ALL ON public.presentiel_validation_decisions TO service_role;
ALTER TABLE public.presentiel_validation_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.presentiel_validation_decisions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE TABLE public.presentiel_presence_creneaux (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL UNIQUE,
 validation_id uuid NOT NULL UNIQUE REFERENCES public.presentiel_heures_validees(id),
 apprenant_id uuid NOT NULL, inscription_id uuid NOT NULL, session_id uuid NOT NULL,
 date_presence date NOT NULL, creneau text NOT NULL, debut time NOT NULL, fin time NOT NULL,
 minutes integer NOT NULL CHECK(minutes > 0 AND minutes <= 720),
 formateur_id uuid, formateur_nom text,
 justificatif text NOT NULL CHECK(justificatif IN ('feuille','attestation','autre')),
 justificatif_libelle text,
 pdf_chemin text NOT NULL UNIQUE,
 remplace uuid[] NOT NULL DEFAULT '{}',
 auteur uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(fin > debut),
 CHECK(formateur_id IS NOT NULL OR length(btrim(coalesce(formateur_nom,''))) >= 2)
);
GRANT SELECT ON public.presentiel_presence_creneaux TO authenticated;
GRANT ALL ON public.presentiel_presence_creneaux TO service_role;
ALTER TABLE public.presentiel_presence_creneaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY presence_creneau_admin_read ON public.presentiel_presence_creneaux FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.presentiel_decisions_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Journal immuable : aucune modification ou suppression' USING ERRCODE='42501'; END $$;
CREATE TRIGGER decisions_immutable BEFORE UPDATE OR DELETE ON public.presentiel_validation_decisions FOR EACH ROW EXECUTE FUNCTION public.presentiel_decisions_append_only();
CREATE TRIGGER presence_creneau_immutable BEFORE UPDATE OR DELETE ON public.presentiel_presence_creneaux FOR EACH ROW EXECUTE FUNCTION public.presentiel_decisions_append_only();
REVOKE ALL ON FUNCTION public.presentiel_decisions_append_only() FROM PUBLIC,anon,authenticated;

-- Même règle que l'application : images vierges connues = pas une signature.
CREATE FUNCTION public.presentiel_signature_valide(u text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT u IS NOT NULL AND u ~* '^data:image/(png|jpeg|jpg);base64,[a-z0-9+/=\s]+$'
 AND NOT EXISTS (SELECT 1 FROM (VALUES
  (4642,'/6n6jacAAAAGSURBVAMAsfYBgSFBzwQAAAAASUVORK5CYII='),
  (3782,'2CZqFIIAAQIECBAgQOABapcAwbzSp88AAAAASUVORK5CYII='),
  (6774,'/wqDd10AAAAGSURBVAMAkhoB37/tmuMAAAAASUVORK5CYII='),
  (2842,'/zCE8zgAAAAGSURBVAMAvTUBIS6o+00AAAAASUVORK5CYII=')) b(l,f)
  WHERE length(u)=b.l AND right(u,length(b.f))=b.f)
$$;

CREATE FUNCTION public.presentiel_decision_active(p_validation uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT d.action FROM public.presentiel_validation_decisions d WHERE d.validation_id=p_validation ORDER BY d.version DESC LIMIT 1),'restaurer')='restaurer'
$$;

-- Bilan d'une journée de théorie : minutes prévues (inscription), signées (preuve réelle), validées (actives).
CREATE FUNCTION public.presentiel_bilan_jour(p_apprenant uuid, p_date date, p_exclure uuid[])
RETURNS TABLE(prevues integer, signees integer, validees integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH slots AS (
  SELECT t.creneau, max(extract(epoch from (t.fin - t.debut))/60)::integer m
  FROM public.emargement_theorie_inscrite(p_apprenant, NULL) t
  WHERE t.date_cours = p_date AND NOT t.pratique GROUP BY t.creneau
 ), sig AS (
  SELECT s.m FROM slots s WHERE EXISTS (
    SELECT 1 FROM public.emargements_fc e WHERE e.apprenant_id=p_apprenant AND e.date_emargement=p_date AND e.demi_journee=s.creneau
    AND coalesce(e.masque,false)=false AND coalesce(e.absent,false)=false AND public.presentiel_signature_valide(e.signature_data_url))
   OR EXISTS (SELECT 1 FROM public.fc_signatures_papier p WHERE p.apprenant_id=p_apprenant AND p.date_presence=p_date AND p.creneau=s.creneau)
 )
 SELECT (SELECT coalesce(sum(m),0) FROM slots)::integer,
        (SELECT coalesce(sum(m),0) FROM sig)::integer,
        (SELECT coalesce(sum(round(v.heures*60)),0) FROM public.presentiel_heures_validees v
          WHERE v.apprenant_id=p_apprenant AND v.date_presence=p_date AND v.categorie='theorie'
          AND NOT (v.id = ANY(coalesce(p_exclure,'{}'::uuid[]))) AND public.presentiel_decision_active(v.id))::integer
$$;
REVOKE ALL ON FUNCTION public.presentiel_bilan_jour(uuid,date,uuid[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.presentiel_decision_active(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.presentiel_dossier_protege(p_apprenant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.edof_fin_formation WHERE apprenant_id=p_apprenant)
     OR EXISTS(SELECT 1 FROM public.releve_jalons_fin_acces WHERE apprenant_id=p_apprenant)
     OR EXISTS(SELECT 1 FROM public.releve_jalons_gels WHERE apprenant_id=p_apprenant)
$$;
REVOKE ALL ON FUNCTION public.presentiel_dossier_protege(uuid) FROM PUBLIC,anon,authenticated;

-- Annulation / restauration ciblée : une ligne de journal, l'original reste intact.
CREATE FUNCTION public.presentiel_decider_validation(p_operation uuid,p_apprenant uuid,p_validation uuid,p_version integer,p_action text,p_motif text)
RETURNS public.presentiel_validation_decisions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.presentiel_validation_decisions; previous public.presentiel_validation_decisions; v public.presentiel_heures_validees; motif_effectif text; b record;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 motif_effectif := CASE WHEN p_action='annuler' THEN 'Révocation confirmée par l’administration' ELSE btrim(coalesce(p_motif,'')) END;
 IF p_action IS NULL OR p_action NOT IN ('annuler','restaurer') OR p_version IS NULL OR p_version<0 OR p_operation IS NULL OR p_validation IS NULL OR p_apprenant IS NULL OR length(motif_effectif) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Décision invalide' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('releve_fin_acces:'||p_apprenant::text));
 PERFORM pg_advisory_xact_lock(hashtext('presence_decision:'||p_validation::text));
 SELECT * INTO v FROM public.presentiel_heures_validees WHERE id=p_validation AND apprenant_id=p_apprenant FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Validation étrangère ou introuvable' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.presentiel_validation_decisions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF d.validation_id=p_validation AND d.apprenant_id=p_apprenant AND d.action=p_action AND d.motif=motif_effectif AND d.version=p_version+1 AND d.created_by=auth.uid() THEN RETURN d; END IF;
  RAISE EXCEPTION 'Opération contradictoire' USING ERRCODE='P0551';
 END IF;
 IF public.presentiel_dossier_protege(p_apprenant) THEN
  RAISE EXCEPTION 'Dossier protégé (EDOF, fin d’accès ou relevé figé) : revue nominative avant changement' USING ERRCODE='42501';
 END IF;
 SELECT * INTO previous FROM public.presentiel_validation_decisions WHERE validation_id=p_validation ORDER BY version DESC LIMIT 1;
 IF coalesce(previous.version,0)<>p_version THEN RAISE EXCEPTION 'Version périmée : relire' USING ERRCODE='P0551'; END IF;
 IF p_action=coalesce(previous.action,'restaurer') THEN RAISE EXCEPTION 'État déjà appliqué' USING ERRCODE='22023'; END IF;
 IF p_action='restaurer' AND v.categorie='theorie' AND v.date_presence IS NOT NULL THEN
  SELECT * INTO b FROM public.presentiel_bilan_jour(p_apprenant, v.date_presence, ARRAY[v.id]);
  IF b.prevues > 0 AND b.signees + b.validees + round(v.heures*60) > b.prevues THEN
   RAISE EXCEPTION 'Restauration refusée : la journée dépasserait les heures prévues (% min signées + % min validées + % min > % min prévues)', b.signees, b.validees, round(v.heures*60), b.prevues USING ERRCODE='P0552';
  END IF;
 END IF;
 INSERT INTO public.presentiel_validation_decisions(operation_id,validation_id,apprenant_id,version,action,motif,created_by,original)
 VALUES(p_operation,p_validation,p_apprenant,p_version+1,p_action,motif_effectif,auth.uid(),to_jsonb(v)) RETURNING * INTO d;
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.presentiel_decider_validation(uuid,uuid,uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_decider_validation(uuid,uuid,uuid,integer,text,text) TO authenticated;

-- Validation ciblée d'un créneau non signé, avec PDF privé déjà déposé par le même administrateur.
CREATE FUNCTION public.presentiel_valider_creneau(
 p_operation uuid, p_apprenant uuid, p_inscription uuid, p_session uuid, p_date date, p_creneau text,
 p_debut time, p_fin time, p_formateur uuid, p_formateur_nom text, p_justificatif text, p_justificatif_libelle text,
 p_pdf_chemin text, p_remplace uuid[], p_confirme boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.presentiel_presence_creneaux; minutes integer; b record; r uuid; prev public.presentiel_validation_decisions;
 nouvelle uuid; maintenant timestamp := clock_timestamp() AT TIME ZONE 'Europe/Paris'; obj record; remplace uuid[] := coalesce(p_remplace,'{}'::uuid[]);
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR p_apprenant IS NULL OR p_inscription IS NULL OR p_session IS NULL OR p_date IS NULL OR p_creneau IS NULL OR p_debut IS NULL OR p_fin IS NULL OR p_fin<=p_debut THEN RAISE EXCEPTION 'Demande incomplète' USING ERRCODE='22023'; END IF;
 IF p_confirme IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirmation explicite requise' USING ERRCODE='22023'; END IF;
 IF (p_date + p_fin) > maintenant THEN RAISE EXCEPTION 'Créneau non terminé : validation impossible' USING ERRCODE='22023'; END IF;
 IF p_justificatif IS NULL OR p_justificatif NOT IN ('feuille','attestation','autre') OR (p_justificatif='autre' AND length(btrim(coalesce(p_justificatif_libelle,'')))<2) THEN RAISE EXCEPTION 'Justificatif requis' USING ERRCODE='22023'; END IF;
 IF p_formateur IS NULL AND length(btrim(coalesce(p_formateur_nom,'')))<2 THEN RAISE EXCEPTION 'Formateur requis' USING ERRCODE='22023'; END IF;
 IF p_formateur IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.formateurs WHERE id=p_formateur) THEN RAISE EXCEPTION 'Formateur enregistré introuvable' USING ERRCODE='22023'; END IF;
 IF p_pdf_chemin IS DISTINCT FROM (p_apprenant::text||'/'||p_operation::text||'.pdf') THEN RAISE EXCEPTION 'Chemin du justificatif invalide' USING ERRCODE='22023'; END IF;

 PERFORM pg_advisory_xact_lock(hashtext('releve_fin_acces:'||p_apprenant::text));
 SELECT * INTO l FROM public.presentiel_presence_creneaux WHERE operation_id=p_operation;
 IF FOUND THEN
  IF l.apprenant_id=p_apprenant AND l.date_presence=p_date AND l.creneau=p_creneau AND l.debut=p_debut AND l.fin=p_fin AND l.auteur=auth.uid() AND l.pdf_chemin=p_pdf_chemin THEN
   RETURN jsonb_build_object('lien_id',l.id,'validation_id',l.validation_id,'minutes',l.minutes,'remplace',to_jsonb(l.remplace),'rejoue',true);
  END IF;
  RAISE EXCEPTION 'Opération réutilisée avec une autre demande' USING ERRCODE='P0551';
 END IF;
 IF public.presentiel_dossier_protege(p_apprenant) THEN RAISE EXCEPTION 'Dossier protégé (EDOF, fin d’accès ou relevé figé) : procédure versionnée requise' USING ERRCODE='42501'; END IF;

 PERFORM 1 FROM public.session_apprenants WHERE id=p_inscription AND apprenant_id=p_apprenant AND session_id=p_session
  AND NOT coalesce(liste_attente,false) AND NOT coalesce(emargements_exclus,false) AND coalesce(statut_suivi,'') !~* 'annul|abandon|exclu|attente' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inscription non autorisée pour ce candidat' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.emargement_theorie_inscrite(p_apprenant,p_session) t WHERE t.date_cours=p_date AND t.creneau=p_creneau AND t.debut=p_debut AND t.fin=p_fin AND NOT t.pratique) THEN
  RAISE EXCEPTION 'Créneau non prévu par l’inscription : validation refusée' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.emargements_fc e WHERE e.apprenant_id=p_apprenant AND e.date_emargement=p_date AND e.demi_journee=p_creneau AND coalesce(e.masque,false)=false
   AND (coalesce(e.absent,false) OR public.presentiel_signature_valide(e.signature_data_url)))
  OR EXISTS(SELECT 1 FROM public.fc_signatures_papier p WHERE p.apprenant_id=p_apprenant AND p.date_presence=p_date AND p.creneau=p_creneau) THEN
  RAISE EXCEPTION 'Créneau déjà signé ou absence enregistrée : aucune validation ajoutée' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.presentiel_presence_creneaux c WHERE c.apprenant_id=p_apprenant AND c.date_presence=p_date AND c.debut<p_fin AND c.fin>p_debut AND public.presentiel_decision_active(c.validation_id)) THEN
  RAISE EXCEPTION 'Présence déjà validée sur ce créneau' USING ERRCODE='22023';
 END IF;

 SELECT o.owner_id, o.metadata INTO obj FROM storage.objects o WHERE o.bucket_id='presentiel-justificatifs' AND o.name=p_pdf_chemin;
 IF NOT FOUND OR obj.owner_id IS DISTINCT FROM auth.uid()::text OR coalesce(obj.metadata->>'mimetype','')<>'application/pdf'
  OR coalesce((obj.metadata->>'size')::bigint,0) NOT BETWEEN 1 AND 4194304 THEN
  RAISE EXCEPTION 'Justificatif PDF privé non retrouvé ou invalide' USING ERRCODE='22023';
 END IF;

 FOREACH r IN ARRAY remplace LOOP
  PERFORM 1 FROM public.presentiel_heures_validees v WHERE v.id=r AND v.apprenant_id=p_apprenant AND v.date_presence=p_date AND v.categorie='theorie'
   AND public.presentiel_decision_active(v.id) AND NOT EXISTS(SELECT 1 FROM public.presentiel_presence_creneaux c WHERE c.validation_id=v.id) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Validation à remplacer non éligible (autre jour, déjà annulée ou liée à un créneau)' USING ERRCODE='22023'; END IF;
 END LOOP;

 minutes := (extract(epoch from (p_fin-p_debut))/60)::integer;
 SELECT * INTO b FROM public.presentiel_bilan_jour(p_apprenant,p_date,remplace);
 IF b.signees + b.validees + minutes > b.prevues THEN
  RAISE EXCEPTION 'Validation refusée : le % la journée compterait % min signées + % min déjà validées + % min = plus que les % min prévues. Si une validation sans créneau de ce jour vise ce même créneau, cochez son remplacement.', to_char(p_date,'DD/MM/YYYY'), b.signees, b.validees, minutes, b.prevues USING ERRCODE='P0552';
 END IF;

 FOREACH r IN ARRAY remplace LOOP
  SELECT * INTO prev FROM public.presentiel_validation_decisions WHERE validation_id=r ORDER BY version DESC LIMIT 1;
  INSERT INTO public.presentiel_validation_decisions(operation_id,validation_id,apprenant_id,version,action,motif,created_by,original)
  SELECT gen_random_uuid(), v.id, p_apprenant, coalesce(prev.version,0)+1, 'annuler', 'Remplacée par la validation ciblée du créneau '||p_creneau||' du '||to_char(p_date,'DD/MM/YYYY'), auth.uid(), to_jsonb(v)
  FROM public.presentiel_heures_validees v WHERE v.id=r;
 END LOOP;

 INSERT INTO public.presentiel_heures_validees(apprenant_id,heures,motif,created_by,date_presence,categorie)
 VALUES(p_apprenant, round(minutes/60.0,2), left('Présence validée administrativement — créneau '||p_creneau||' '||to_char(p_debut,'HH24:MI')||'–'||to_char(p_fin,'HH24:MI')||' — justificatif : '||
   CASE p_justificatif WHEN 'feuille' THEN 'feuille d’émargement' WHEN 'attestation' THEN 'attestation' ELSE btrim(p_justificatif_libelle) END,500),
   auth.uid(), p_date, 'theorie') RETURNING id INTO nouvelle;
 INSERT INTO public.presentiel_presence_creneaux(operation_id,validation_id,apprenant_id,inscription_id,session_id,date_presence,creneau,debut,fin,minutes,formateur_id,formateur_nom,justificatif,justificatif_libelle,pdf_chemin,remplace,auteur)
 VALUES(p_operation,nouvelle,p_apprenant,p_inscription,p_session,p_date,p_creneau,p_debut,p_fin,minutes,p_formateur,nullif(btrim(coalesce(p_formateur_nom,'')),''),p_justificatif,nullif(btrim(coalesce(p_justificatif_libelle,'')),''),p_pdf_chemin,remplace,auth.uid())
 RETURNING * INTO l;
 RETURN jsonb_build_object('lien_id',l.id,'validation_id',nouvelle,'minutes',minutes,'remplace',to_jsonb(remplace),'rejoue',false);
END $$;
REVOKE ALL ON FUNCTION public.presentiel_valider_creneau(uuid,uuid,uuid,uuid,date,text,time,time,uuid,text,text,text,text,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_valider_creneau(uuid,uuid,uuid,uuid,date,text,time,time,uuid,text,text,text,text,uuid[],boolean) TO authenticated;

-- Projection serveur des validations effectives.
CREATE FUNCTION public.presentiel_validations_effectives(p_apprenant uuid)
RETURNS SETOF public.presentiel_heures_validees LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT v.* FROM public.presentiel_heures_validees v
 WHERE v.apprenant_id=p_apprenant AND public.has_role(auth.uid(),'admin') AND public.presentiel_decision_active(v.id)
$$;
REVOKE ALL ON FUNCTION public.presentiel_validations_effectives(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_validations_effectives(uuid) TO authenticated,service_role;

-- Stockage privé : dépôt et lecture par administrateur uniquement, PDF, aucun remplacement ni suppression.
CREATE POLICY presence_pdf_admin_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='presentiel-justificatifs' AND public.has_role(auth.uid(),'admin') AND lower(storage.extension(name))='pdf'
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$');
CREATE POLICY presence_pdf_admin_select ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='presentiel-justificatifs' AND public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.presentiel_validation_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presentiel_presence_creneaux;

-- Futurs relevés serveur : validations annulées exclues ; relevés existants jamais réécrits.
DO $$
DECLARE definition text; needle text := 'FROM public.presentiel_heures_validees WHERE apprenant_id = _id)';
BEGIN
 definition := pg_get_functiondef('public.releve_sources_apprenant(uuid)'::regprocedure);
 IF position(needle in definition)=0 THEN RAISE EXCEPTION 'Lecteur serveur différent du catalogue vérifié : installation refusée'; END IF;
 EXECUTE replace(definition,needle,'FROM public.presentiel_heures_validees v WHERE apprenant_id = _id AND public.presentiel_decision_active(v.id))');
END $$;
