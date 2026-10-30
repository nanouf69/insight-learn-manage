CREATE TABLE public.crm_reinscription_choix (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL UNIQUE,
 apprenant_id uuid NOT NULL REFERENCES public.apprenants(id), date_examen date NOT NULL,
 choix text NOT NULL CHECK (choix IN ('oui','non')), auteur uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.crm_reinscription_choix TO authenticated;
GRANT ALL ON public.crm_reinscription_choix TO service_role;
ALTER TABLE public.crm_reinscription_choix ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_lecture ON public.crm_reinscription_choix FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX crm_reinscription_scope ON public.crm_reinscription_choix(apprenant_id,date_examen,created_at DESC,id);

CREATE TABLE public.crm_acces_extensions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL UNIQUE,
 apprenant_id uuid NOT NULL REFERENCES public.apprenants(id), auteur uuid NOT NULL,
 debut date NOT NULL, fin date NOT NULL, fin_precedente date,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), CHECK (fin >= debut)
);
GRANT SELECT ON public.crm_acces_extensions TO authenticated;
GRANT ALL ON public.crm_acces_extensions TO service_role;
ALTER TABLE public.crm_acces_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_lecture ON public.crm_acces_extensions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX crm_extension_scope ON public.crm_acces_extensions(apprenant_id,fin DESC);

CREATE FUNCTION public.crm_action_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Historique administratif immuable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER historique_immuable BEFORE UPDATE OR DELETE ON public.crm_reinscription_choix FOR EACH ROW EXECUTE FUNCTION public.crm_action_immuable();
CREATE TRIGGER historique_immuable BEFORE UPDATE OR DELETE ON public.crm_acces_extensions FOR EACH ROW EXECUTE FUNCTION public.crm_action_immuable();

CREATE FUNCTION public.crm_date_examen_iso(p_text text) RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE t text:=lower(translate(trim(p_text),'éèêàâôûùîïç','eeeaaouuiic')); m text[]; n int;
BEGIN
 IF t ~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN t::date; END IF;
 m:=regexp_match(t,'^(\d{1,2})/(\d{1,2})/(\d{4})$');
 IF m IS NOT NULL THEN RETURN make_date(m[3]::int,m[2]::int,m[1]::int); END IF;
 m:=regexp_match(t,'^(\d{1,2}) ([a-z]+) (\d{4})$');
 IF m IS NOT NULL THEN
 n:=array_position(ARRAY['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'],m[2]);
 IF n IS NOT NULL THEN RETURN make_date(m[3]::int,n,m[1]::int); END IF;
 END IF; RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL; END $$;

CREATE FUNCTION public.crm_enregistrer_reinscription(p_operation uuid,p_apprenant uuid,p_examen date,p_choix text,p_precedent uuid DEFAULT NULL)
RETURNS public.crm_reinscription_choix LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.crm_reinscription_choix; a public.apprenants; dernier uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Action réservée à l’administration' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR p_examen IS NULL OR p_choix IS NULL OR p_choix NOT IN ('oui','non') THEN RAISE EXCEPTION 'Choix ou examen invalide'; END IF;
 SELECT * INTO a FROM public.apprenants WHERE id=p_apprenant FOR UPDATE;
 IF NOT FOUND OR a.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Dossier indisponible'; END IF;
 SELECT * INTO r FROM public.crm_reinscription_choix WHERE operation_id=p_operation;
 IF FOUND THEN
 IF r.apprenant_id<>p_apprenant OR r.date_examen<>p_examen OR r.choix<>p_choix OR r.auteur<>auth.uid() THEN RAISE EXCEPTION 'Opération incompatible'; END IF;
 RETURN r; END IF;
 IF public.crm_date_examen_iso(a.date_examen_theorique) IS DISTINCT FROM p_examen AND NOT EXISTS (
 SELECT 1 FROM public.documents_a_signer WHERE apprenant_id=p_apprenant AND modele_code='echec_theorie_choix_pratique' AND cle_envoi='examen_theorique:'||p_examen::text
 ) THEN RAISE EXCEPTION 'Examen non rattaché au dossier'; END IF;
 SELECT id INTO dernier FROM public.crm_reinscription_choix WHERE apprenant_id=p_apprenant AND date_examen=p_examen ORDER BY created_at DESC,id DESC LIMIT 1;
 IF dernier IS DISTINCT FROM p_precedent THEN RAISE EXCEPTION 'Choix modifié dans une autre fenêtre : relisez avant de confirmer' USING ERRCODE='40001'; END IF;
 INSERT INTO public.crm_reinscription_choix(operation_id,apprenant_id,date_examen,choix,auteur) VALUES(p_operation,p_apprenant,p_examen,p_choix,auth.uid()) RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.crm_enregistrer_reinscription(uuid,uuid,date,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_enregistrer_reinscription(uuid,uuid,date,text,uuid) TO authenticated;

CREATE FUNCTION public.crm_preparer_reactivation(p_apprenant uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.apprenants; aujourd date:=(now() AT TIME ZONE 'Europe/Paris')::date; precedente date; debut date; fin date;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Action réservée à l’administration' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.apprenants WHERE id=p_apprenant;
 IF NOT FOUND OR a.deleted_at IS NOT NULL OR coalesce(a.abandonnee,false) OR a.compte_cours_archive_at IS NOT NULL OR lower(coalesce(a.statut,'')) IN ('archive','archivé','annulé','annule') THEN RAISE EXCEPTION 'Dossier bloqué ou archivé'; END IF;
 IF a.auth_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=a.auth_user_id AND (banned_until IS NULL OR banned_until<=now())) THEN RAISE EXCEPTION 'Compte existant actif requis'; END IF;
 IF coalesce(cardinality(a.modules_autorises),0)=0 THEN RAISE EXCEPTION 'Aucun module attribué'; END IF;
 IF a.date_debut_cours_en_ligne>aujourd THEN RAISE EXCEPTION 'Accès pas encore commencé'; END IF;
 SELECT greatest(a.date_fin_cours_en_ligne,max(e.fin)) INTO precedente FROM public.crm_acces_extensions e WHERE e.apprenant_id=p_apprenant;
 IF precedente IS NULL THEN RAISE EXCEPTION 'Fin d’accès initiale manquante'; END IF;
 debut:=greatest(aujourd,precedente);
 fin:=(debut+interval '1 month')::date;
 RETURN jsonb_build_object('fin_precedente',precedente,'debut',debut,'fin',fin,'jour_paris',aujourd);
END $$;
REVOKE ALL ON FUNCTION public.crm_preparer_reactivation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_preparer_reactivation(uuid) TO authenticated;

CREATE FUNCTION public.crm_reactiver_un_mois(p_operation uuid,p_apprenant uuid,p_fin_precedente date,p_fin_confirmee date)
RETURNS public.crm_acces_extensions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.crm_acces_extensions; proposition jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Action réservée à l’administration' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL THEN RAISE EXCEPTION 'Identité d’opération requise'; END IF;
 PERFORM 1 FROM public.apprenants WHERE id=p_apprenant FOR UPDATE;
 SELECT * INTO r FROM public.crm_acces_extensions WHERE operation_id=p_operation;
 IF FOUND THEN
 IF r.apprenant_id<>p_apprenant OR r.auteur<>auth.uid() OR r.fin IS DISTINCT FROM p_fin_confirmee OR r.fin_precedente IS DISTINCT FROM p_fin_precedente THEN RAISE EXCEPTION 'Opération incompatible'; END IF;
 RETURN r; END IF;
 proposition:=public.crm_preparer_reactivation(p_apprenant);
 IF (proposition->>'fin_precedente')::date IS DISTINCT FROM p_fin_precedente OR (proposition->>'fin')::date IS DISTINCT FROM p_fin_confirmee THEN RAISE EXCEPTION 'Dates modifiées : relisez avant de confirmer' USING ERRCODE='40001'; END IF;
 INSERT INTO public.crm_acces_extensions(operation_id,apprenant_id,auteur,debut,fin,fin_precedente)
 VALUES(p_operation,p_apprenant,auth.uid(),(proposition->>'debut')::date,(proposition->>'fin')::date,p_fin_precedente) RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.crm_reactiver_un_mois(uuid,uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_reactiver_un_mois(uuid,uuid,date,date) TO authenticated;

CREATE FUNCTION public.crm_lire_extension_acces(p_apprenant uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.apprenants; r public.crm_acces_extensions; aujourd date:=(now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
 SELECT * INTO a FROM public.apprenants WHERE id=p_apprenant;
 IF auth.uid() IS NULL OR NOT FOUND OR (a.auth_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Accès non autorisé' USING ERRCODE='42501'; END IF;
 IF a.deleted_at IS NOT NULL OR coalesce(a.abandonnee,false) OR a.compte_cours_archive_at IS NOT NULL OR lower(coalesce(a.statut,'')) IN ('archive','archivé','annulé','annule') OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=a.auth_user_id AND (banned_until IS NULL OR banned_until<=now())) THEN RETURN jsonb_build_object('autorise',false); END IF;
 SELECT * INTO r FROM public.crm_acces_extensions WHERE apprenant_id=p_apprenant AND debut<=aujourd AND fin>=aujourd ORDER BY fin DESC LIMIT 1;
 RETURN jsonb_build_object('autorise',FOUND,'debut',r.debut,'fin',r.fin);
END $$;
REVOKE ALL ON FUNCTION public.crm_lire_extension_acces(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_lire_extension_acces(uuid) TO authenticated;