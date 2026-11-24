-- PREPARATION ONLY. Not applied to the shared backend. No schedule or seed.
-- Activation and activity are explicit append-only responsible decisions.
CREATE TABLE public.competences_annuelles_controle (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 responsable_id uuid NOT NULL, actif boolean NOT NULL DEFAULT false,
 publication_verifiee boolean NOT NULL DEFAULT false, restauration_verifiee boolean NOT NULL DEFAULT false,
 motif text NOT NULL
);
GRANT SELECT, INSERT ON public.competences_annuelles_controle TO authenticated;
GRANT ALL ON public.competences_annuelles_controle TO service_role;
ALTER TABLE public.competences_annuelles_controle ENABLE ROW LEVEL SECURITY;
CREATE POLICY responsable_lecture ON public.competences_annuelles_controle FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY responsable_decision ON public.competences_annuelles_controle FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin') AND responsable_id=auth.uid() AND length(trim(motif))>0 AND (NOT actif OR (publication_verifiee AND restauration_verifiee)));

CREATE TABLE public.competences_formateurs_activite (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 formateur_id uuid NOT NULL REFERENCES public.formateurs(id), responsable_id uuid NOT NULL,
 actif boolean NOT NULL, motif text NOT NULL
);
GRANT SELECT, INSERT ON public.competences_formateurs_activite TO authenticated;
GRANT ALL ON public.competences_formateurs_activite TO service_role;
ALTER TABLE public.competences_formateurs_activite ENABLE ROW LEVEL SECURITY;
CREATE POLICY responsable_lecture ON public.competences_formateurs_activite FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY responsable_decision ON public.competences_formateurs_activite FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin') AND responsable_id=auth.uid() AND length(trim(motif))>0);

CREATE TABLE public.competences_annuelles_demandes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 formateur_id uuid NOT NULL REFERENCES public.formateurs(id), cycle text NOT NULL,
 document_id uuid NOT NULL UNIQUE REFERENCES public.documents_a_signer(id),
 expires_at timestamptz NOT NULL, UNIQUE(formateur_id,cycle)
);
GRANT SELECT ON public.competences_annuelles_demandes TO authenticated;
GRANT ALL ON public.competences_annuelles_demandes TO service_role;
ALTER TABLE public.competences_annuelles_demandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY responsable_lecture ON public.competences_annuelles_demandes FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE TABLE public.competences_annuelles_evenements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 demande_id uuid NOT NULL REFERENCES public.competences_annuelles_demandes(id),
 etat text NOT NULL CHECK(etat IN ('reserve','envoye','indetermine','revoque')),
 preuve_transport text, UNIQUE(demande_id,etat)
);
GRANT SELECT ON public.competences_annuelles_evenements TO authenticated;
GRANT ALL ON public.competences_annuelles_evenements TO service_role;
ALTER TABLE public.competences_annuelles_evenements ENABLE ROW LEVEL SECURITY;
CREATE POLICY responsable_lecture ON public.competences_annuelles_evenements FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.competences_annuelles_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Historique des compétences immuable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER immuable BEFORE UPDATE OR DELETE ON public.competences_annuelles_controle FOR EACH ROW EXECUTE FUNCTION public.competences_annuelles_immutable();
CREATE TRIGGER immuable BEFORE UPDATE OR DELETE ON public.competences_formateurs_activite FOR EACH ROW EXECUTE FUNCTION public.competences_annuelles_immutable();
CREATE TRIGGER immuable BEFORE UPDATE OR DELETE ON public.competences_annuelles_demandes FOR EACH ROW EXECUTE FUNCTION public.competences_annuelles_immutable();
CREATE TRIGGER immuable BEFORE UPDATE OR DELETE ON public.competences_annuelles_evenements FOR EACH ROW EXECUTE FUNCTION public.competences_annuelles_immutable();

CREATE FUNCTION public.competences_annuelles_reserver(p_formateur uuid,p_cycle text,p_token text,p_version text,p_declaration text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE controle public.competences_annuelles_controle; f public.formateurs; validation_id uuid; validation_le timestamptz;
 cycle_attendu text; doc_id uuid; demande_id uuid; frozen jsonb; expiry timestamptz;
BEGIN
 -- No public/authenticated execute grant; only service may atomically reserve.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_formateur::text,0));
 SELECT * INTO controle FROM public.competences_annuelles_controle ORDER BY created_at DESC,id DESC LIMIT 1;
 IF controle.actif IS DISTINCT FROM true OR controle.publication_verifiee IS DISTINCT FROM true OR controle.restauration_verifiee IS DISTINCT FROM true THEN RETURN NULL; END IF;
 IF (SELECT actif FROM public.competences_formateurs_activite WHERE formateur_id=p_formateur ORDER BY created_at DESC,id DESC LIMIT 1) IS DISTINCT FROM true THEN RETURN NULL; END IF;
 SELECT * INTO f FROM public.formateurs WHERE id=p_formateur;
 IF f.email IS NULL OR f.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NULL; END IF;
 SELECT review.id,review.signed_at INTO validation_id,validation_le
 FROM public.documents_a_signer review JOIN public.documents_a_signer source ON source.id::text=review.cle_envoi
 WHERE review.modele_code='validation_competences_responsable' AND review.statut='signe'
 AND review.reponses->>'decision'='valide' AND review.reponses->>'confirme'='true'
 AND review.created_by IS NOT NULL AND review.reponses->>'responsable_id'=review.created_by::text
 AND review.reponses->>'document_source'=source.id::text
 AND length(review.reponses->>'methode')>0 AND length(review.reponses->>'motif')>0
 AND source.modele_code='justification_competences_intervenant'
 AND source.identite_figee->>'formateur_id'=p_formateur::text AND source.statut='signe'
 AND source.signed_at IS NOT NULL AND source.reponses->>'declaration_acceptee'='true'
 AND review.signed_at IS NOT NULL AND review.signed_at<=now()
 ORDER BY review.signed_at DESC,review.id LIMIT 1;
 cycle_attendu:=p_formateur::text||':'||coalesce(validation_id::text,'premiere-demande');
 IF p_cycle IS DISTINCT FROM cycle_attendu OR (validation_le IS NOT NULL AND ((validation_le AT TIME ZONE 'Europe/Paris')+interval '12 months') AT TIME ZONE 'Europe/Paris'>now()) THEN RETURN NULL; END IF;
 -- Adopt existing invitation without resending, including Albert's pre-created form.
 IF validation_id IS NULL AND EXISTS(SELECT 1 FROM public.documents_a_signer WHERE modele_code='justification_competences_intervenant' AND identite_figee->>'formateur_id'=p_formateur::text) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.competences_annuelles_demandes WHERE formateur_id=p_formateur AND cycle=p_cycle) THEN RETURN NULL; END IF;
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR p_version IS DISTINCT FROM 'services-pro-competences-2026-11-24-v1' OR p_declaration IS DISTINCT FROM 'Je certifie l’exactitude des informations et des justificatifs que je fournis. Les expériences et qualifications indiquées correspondent à ma situation réelle. Je distingue les diplômes et certifications obtenus des formations suivies sans certification. Je m’engage à signaler toute information devenue inexacte. Cette déclaration ne vaut pas validation des compétences par SERVICES PRO ; le responsable examine séparément leur adéquation aux missions confiées.' THEN RAISE EXCEPTION 'Modèle ou jeton invalide'; END IF;
 expiry:=now()+interval '30 days';
 frozen:=jsonb_build_object('version',p_version,'declaration',p_declaration,'cycle',p_cycle,'expires_at',expiry);
 INSERT INTO public.documents_a_signer(nom,file_path,champs,modele_code,modele_version,token,destinataire_nom,destinataire_email,identite_figee,texte_fige,cle_envoi,reponses,statut)
 VALUES('Actualisation annuelle — '||f.prenom||' '||f.nom,'','[]','justification_competences_intervenant',p_version,p_token,f.prenom||' '||f.nom,f.email,jsonb_build_object('formateur_id',f.id,'nom',f.nom,'prenom',f.prenom,'email',f.email),frozen::text,p_cycle,'{}','brouillon') RETURNING id INTO doc_id;
 INSERT INTO public.competences_annuelles_demandes(formateur_id,cycle,document_id,expires_at) VALUES(p_formateur,p_cycle,doc_id,expiry) RETURNING id INTO demande_id;
 INSERT INTO public.competences_annuelles_evenements(demande_id,etat) VALUES(demande_id,'reserve');
 RETURN demande_id;
END $$;
REVOKE ALL ON FUNCTION public.competences_annuelles_reserver(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.competences_annuelles_reserver(uuid,text,text,text,text) TO service_role;
COMMENT ON FUNCTION public.competences_annuelles_reserver(uuid,text,text,text,text) IS 'PREPARATION: installs no scheduler; explicit activation, activity and complete transport adapter required.';