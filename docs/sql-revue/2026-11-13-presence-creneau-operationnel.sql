-- REVIEW ONLY: not installed. Private bucket must be created through Storage API.
CREATE TABLE public.presentiel_presence_pdf (
 id uuid PRIMARY KEY, operation_id uuid NOT NULL UNIQUE, apprenant_id uuid NOT NULL,
 auteur uuid NOT NULL, chemin text NOT NULL UNIQUE, sha256 text NOT NULL,
 taille integer NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT pdf_integrite CHECK (taille > 0 AND taille <= 4194304 AND sha256 ~ '^[0-9a-f]{64}$')
);
GRANT SELECT ON public.presentiel_presence_pdf TO authenticated;
GRANT ALL ON public.presentiel_presence_pdf TO service_role;
ALTER TABLE public.presentiel_presence_pdf ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdf_admin ON public.presentiel_presence_pdf FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE TABLE public.presentiel_presence_creneaux (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL UNIQUE,
 apprenant_id uuid NOT NULL, inscription_id uuid NOT NULL, session_id uuid NOT NULL,
 date_presence date NOT NULL, creneau text NOT NULL, debut time NOT NULL, fin time NOT NULL,
 minutes integer NOT NULL, formateur_id uuid NOT NULL, justificatif text NOT NULL,
 pdf_id uuid NOT NULL REFERENCES public.presentiel_presence_pdf(id),
 rapprochements jsonb NOT NULL DEFAULT '[]', auteur uuid NOT NULL,
 valide_le timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(fin > debut AND minutes > 0 AND minutes <= 1440),
 CHECK(justificatif IN ('feuille','attestation','autre')),
 UNIQUE(apprenant_id,date_presence,creneau)
);
GRANT SELECT ON public.presentiel_presence_creneaux TO authenticated;
GRANT ALL ON public.presentiel_presence_creneaux TO service_role;
ALTER TABLE public.presentiel_presence_creneaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY presence_admin ON public.presentiel_presence_creneaux FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.presentiel_presence_immuable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Preuve append-only : aucune modification ou suppression' USING ERRCODE='42501'; END $$;
CREATE TRIGGER presence_pdf_immuable BEFORE UPDATE OR DELETE ON public.presentiel_presence_pdf FOR EACH ROW EXECUTE FUNCTION public.presentiel_presence_immuable();
CREATE TRIGGER presence_creneau_immuable BEFORE UPDATE OR DELETE ON public.presentiel_presence_creneaux FOR EACH ROW EXECUTE FUNCTION public.presentiel_presence_immuable();

CREATE FUNCTION public.presentiel_confirmer_creneau(
 p_operation uuid,p_apprenant uuid,p_inscription uuid,p_session uuid,p_date date,
 p_creneau text,p_debut time,p_fin time,p_formateur uuid,p_justificatif text,p_pdf uuid,
 p_rapprochements jsonb,p_confirme boolean,p_confirme_remplacement boolean
) RETURNS public.presentiel_presence_creneaux LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ancien public.presentiel_presence_creneaux; preuve public.presentiel_presence_pdf;
 attendu jsonb; nombre integer; resultat public.presentiel_presence_creneaux;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 IF p_confirme IS DISTINCT FROM true OR p_date IS NULL OR p_date > (clock_timestamp() AT TIME ZONE 'Europe/Paris')::date THEN RAISE EXCEPTION 'Présence réelle passée et confirmation requises'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_apprenant::text,0));
 SELECT * INTO ancien FROM public.presentiel_presence_creneaux WHERE operation_id=p_operation;
 IF FOUND THEN
  IF ancien.apprenant_id=p_apprenant AND ancien.inscription_id=p_inscription AND ancien.session_id=p_session AND ancien.date_presence=p_date AND ancien.creneau=p_creneau AND ancien.debut=p_debut AND ancien.fin=p_fin AND ancien.formateur_id=p_formateur AND ancien.justificatif=p_justificatif AND ancien.pdf_id=p_pdf AND ancien.rapprochements=p_rapprochements AND ancien.auteur=auth.uid() THEN RETURN ancien; END IF;
  RAISE EXCEPTION 'Opération réutilisée avec une autre demande';
 END IF;
 IF EXISTS(SELECT 1 FROM public.edof_fin_formation WHERE apprenant_id=p_apprenant AND mis_fin_formation IS DISTINCT FROM false)
 OR EXISTS(SELECT 1 FROM public.releve_jalons_gels WHERE apprenant_id=p_apprenant)
 OR EXISTS(SELECT 1 FROM public.releve_jalons_fin_acces WHERE apprenant_id=p_apprenant) THEN RAISE EXCEPTION 'Relevé protégé : procédure versionnée requise'; END IF;
 -- Lock exact enrollment and revalidate against the existing server-owned calendar.
 PERFORM 1 FROM public.session_apprenants WHERE id=p_inscription AND apprenant_id=p_apprenant AND session_id=p_session AND NOT coalesce(liste_attente,false) AND NOT coalesce(emargements_exclus,false) AND coalesce(statut_suivi,'') !~* 'annul|abandon|exclu|attente' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inscription non autorisée'; END IF;
 SELECT count(*) INTO nombre FROM public.session_apprenants sa JOIN public.sessions s ON s.id=sa.session_id
 WHERE sa.apprenant_id=p_apprenant AND sa.session_id=p_session AND NOT coalesce(sa.liste_attente,false) AND NOT coalesce(sa.emargements_exclus,false)
 AND coalesce(sa.statut_suivi,'') !~* 'annul|abandon|exclu|attente'
 AND p_date BETWEEN greatest(s.date_debut,coalesce(sa.date_debut,s.date_debut)) AND least(coalesce(s.date_fin,s.date_debut),coalesce(sa.date_fin_personnalisee,sa.date_fin,s.date_fin,s.date_debut));
 IF nombre<>1 OR NOT EXISTS(SELECT 1 FROM public.emargement_theorie_inscrite(p_apprenant,p_session) WHERE date_cours=p_date AND creneau=p_creneau AND debut=p_debut AND fin=p_fin AND NOT pratique) THEN RAISE EXCEPTION 'Créneau exact non prouvé'; END IF;
 PERFORM 1 FROM public.formateurs WHERE id=p_formateur;
 IF NOT FOUND THEN RAISE EXCEPTION 'Formateur enregistré requis'; END IF;
 SELECT * INTO preuve FROM public.presentiel_presence_pdf WHERE id=p_pdf AND operation_id=p_operation AND apprenant_id=p_apprenant AND auteur=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'PDF privé vérifié requis'; END IF;
 -- Preserve original date-only rows. Require explicit full same-day snapshot before superseding their display contribution.
 PERFORM 1 FROM public.presentiel_heures_validees WHERE apprenant_id=p_apprenant AND date_presence=p_date AND categorie='theorie' FOR UPDATE;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',v.id,'heures',v.heures,'date_presence',v.date_presence,'categorie',v.categorie,'created_at',v.created_at) ORDER BY v.id),'[]') INTO attendu FROM public.presentiel_heures_validees v WHERE v.apprenant_id=p_apprenant AND v.date_presence=p_date AND v.categorie='theorie';
 IF attendu IS DISTINCT FROM p_rapprochements THEN RAISE EXCEPTION 'Rapprochement périmé : relire les validations'; END IF;
 IF attendu<>'[]'::jsonb AND p_confirme_remplacement IS DISTINCT FROM true THEN RAISE EXCEPTION 'Remplacement explicite de la couverture du jour requis'; END IF;
 IF EXISTS(SELECT 1 FROM public.presentiel_presence_creneaux WHERE apprenant_id=p_apprenant AND date_presence=p_date AND debut<p_fin AND fin>p_debut) THEN RAISE EXCEPTION 'Présence déjà validée ou chevauchante'; END IF;
 INSERT INTO public.presentiel_presence_creneaux(operation_id,apprenant_id,inscription_id,session_id,date_presence,creneau,debut,fin,minutes,formateur_id,justificatif,pdf_id,rapprochements,auteur)
 VALUES(p_operation,p_apprenant,p_inscription,p_session,p_date,p_creneau,p_debut,p_fin,(extract(epoch from (p_fin-p_debut))/60)::integer,p_formateur,p_justificatif,p_pdf,attendu,auth.uid()) RETURNING * INTO resultat;
 RETURN resultat;
END $$;
REVOKE ALL ON FUNCTION public.presentiel_confirmer_creneau(uuid,uuid,uuid,uuid,date,text,time,time,uuid,text,uuid,jsonb,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.presentiel_confirmer_creneau(uuid,uuid,uuid,uuid,date,text,time,time,uuid,text,uuid,jsonb,boolean,boolean) TO authenticated;
-- Bucket presentiel-justificatifs: PRIVATE, 4MB, application/pdf, created through native Storage API.
-- No client INSERT/UPDATE/DELETE policy: only the authenticated/admin Edge upload may write.
CREATE POLICY presence_pdf_stockage_admin ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='presentiel-justificatifs' AND public.has_role(auth.uid(),'admin'));