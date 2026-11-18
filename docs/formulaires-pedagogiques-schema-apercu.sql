-- PREPARATION ONLY. Not installed in the shared production database.
-- Originals and their answers/signatures are never updated by this circuit.
CREATE TABLE public.formulaire_pedagogique_contextes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_id uuid NOT NULL REFERENCES public.apprenant_documents_completes(id),
 apprenant_id uuid NOT NULL REFERENCES public.apprenants(id),
 inscription_id uuid REFERENCES public.session_apprenants(id),
 session_id uuid REFERENCES public.sessions(id),
 formation text NOT NULL CHECK(length(btrim(formation))>0),
 session_libelle text,
 rempli_le timestamptz,
 valide_le timestamptz,
 decision text CHECK(decision IN ('admis','refuse','en_attente','non_evalue')),
 decision_le timestamptz,
 preuve_reference text NOT NULL CHECK(length(btrim(preuve_reference))>0),
 operation_id uuid NOT NULL UNIQUE,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((decision IS NULL) = (decision_le IS NULL)),
 CHECK(inscription_id IS NOT NULL OR session_id IS NULL),
 CHECK(valide_le IS NULL OR rempli_le IS NULL OR valide_le>=rempli_le)
);
GRANT SELECT ON public.formulaire_pedagogique_contextes TO authenticated;
GRANT ALL ON public.formulaire_pedagogique_contextes TO service_role;
ALTER TABLE public.formulaire_pedagogique_contextes ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.formulaire_pedagogique_contextes FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.formulaire_pedagogique_immutable() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Historique immuable'; END$$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.formulaire_pedagogique_contextes FOR EACH ROW EXECUTE FUNCTION public.formulaire_pedagogique_immutable();
CREATE FUNCTION public.formulaire_pedagogique_enregistrer(p_document uuid,p_inscription uuid,p_formation text,p_rempli timestamptz,p_valide timestamptz,p_decision text,p_decision_le timestamptz,p_preuve text,p_operation uuid,p_expected uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_session uuid; v_label text; v_last uuid; v_id uuid; v_previous public.formulaire_pedagogique_contextes;
BEGIN
 IF NOT COALESCE(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_document::text,0));
 SELECT * INTO v_previous FROM public.formulaire_pedagogique_contextes WHERE operation_id=p_operation;
 IF FOUND THEN
   IF v_previous.document_id<>p_document OR v_previous.created_by<>auth.uid() OR v_previous.inscription_id IS DISTINCT FROM p_inscription OR v_previous.formation IS DISTINCT FROM p_formation OR v_previous.rempli_le IS DISTINCT FROM p_rempli OR v_previous.valide_le IS DISTINCT FROM p_valide OR v_previous.decision IS DISTINCT FROM p_decision OR v_previous.decision_le IS DISTINCT FROM p_decision_le OR v_previous.preuve_reference IS DISTINCT FROM p_preuve THEN RAISE EXCEPTION 'Conflit opération'; END IF;
   RETURN v_previous.id;
 END IF;
 SELECT apprenant_id INTO v_owner FROM public.apprenant_documents_completes WHERE id=p_document AND type_document IN ('analyse-besoin','projet-professionnel','test-competences','evaluation-acquis');
 IF v_owner IS NULL THEN RAISE EXCEPTION 'Document pédagogique introuvable'; END IF;
 SELECT id INTO v_last FROM public.formulaire_pedagogique_contextes WHERE document_id=p_document ORDER BY created_at DESC,id DESC LIMIT 1;
 IF v_last IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Version périmée' USING ERRCODE='40001'; END IF;
 IF p_inscription IS NOT NULL THEN
   SELECT sa.session_id,s.nom INTO v_session,v_label FROM public.session_apprenants sa JOIN public.sessions s ON s.id=sa.session_id WHERE sa.id=p_inscription AND sa.apprenant_id=v_owner;
   IF v_session IS NULL THEN RAISE EXCEPTION 'Inscription étrangère ou inexistante'; END IF;
 END IF;
 IF p_rempli>now() OR p_valide>now() OR p_decision_le>now() THEN RAISE EXCEPTION 'Date future refusée'; END IF;
 INSERT INTO public.formulaire_pedagogique_contextes(document_id,apprenant_id,inscription_id,session_id,formation,session_libelle,rempli_le,valide_le,decision,decision_le,preuve_reference,operation_id,created_by)
 VALUES(p_document,v_owner,p_inscription,v_session,p_formation,v_label,p_rempli,p_valide,p_decision,p_decision_le,p_preuve,p_operation,auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END$$;
REVOKE ALL ON FUNCTION public.formulaire_pedagogique_enregistrer(uuid,uuid,text,timestamptz,timestamptz,text,timestamptz,text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.formulaire_pedagogique_enregistrer(uuid,uuid,text,timestamptz,timestamptz,text,timestamptz,text,uuid,uuid) TO authenticated;
CREATE FUNCTION public.formulaires_pedagogiques_lire(p_apprenant uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT COALESCE(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 RETURN (SELECT COALESCE(jsonb_object_agg(document_id::text,to_jsonb(t)),'{}') FROM (SELECT DISTINCT ON(document_id) * FROM public.formulaire_pedagogique_contextes WHERE apprenant_id=p_apprenant ORDER BY document_id,created_at DESC,id DESC) t);
END$$;
REVOKE ALL ON FUNCTION public.formulaires_pedagogiques_lire(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.formulaires_pedagogiques_lire(uuid) TO authenticated;