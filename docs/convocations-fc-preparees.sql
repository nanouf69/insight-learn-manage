-- PREPARED ONLY. Do not apply/deploy without separate owner approval.
-- No financial, learner, attendance or educational rows are changed.
CREATE TABLE public.fc_convocation_config (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), actif boolean NOT NULL DEFAULT false,
  actif_depuis timestamptz, autorise_par uuid,
  CHECK (NOT actif OR (actif_depuis IS NOT NULL AND autorise_par IS NOT NULL))
);
GRANT SELECT ON public.fc_convocation_config TO authenticated;
GRANT ALL ON public.fc_convocation_config TO service_role;
ALTER TABLE public.fc_convocation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin ON public.fc_convocation_config FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
INSERT INTO public.fc_convocation_config(id) VALUES(true);

-- Append-only explicit bank → enrollment evidence, never inferred from surname alone.
CREATE TABLE public.fc_convocation_rapprochements (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions_bancaires(id),
  inscription_id uuid NOT NULL REFERENCES public.session_apprenants(id),
  confirme_par uuid NOT NULL, piece_reference text NOT NULL CHECK(length(btrim(piece_reference))>0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fc_convocation_rapprochements TO authenticated;
GRANT ALL ON public.fc_convocation_rapprochements TO service_role;
ALTER TABLE public.fc_convocation_rapprochements ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin ON public.fc_convocation_rapprochements FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

-- A contractual installment may differ from the full price. No default €50 assumption.
CREATE TABLE public.fc_convocation_exigibles (
  inscription_id uuid PRIMARY KEY REFERENCES public.session_apprenants(id),
  montant numeric(12,2) NOT NULL CHECK(montant>0),
  reference_contrat text NOT NULL CHECK(length(btrim(reference_contrat))>0), confirme_par uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fc_convocation_exigibles TO authenticated;
GRANT ALL ON public.fc_convocation_exigibles TO service_role;
ALTER TABLE public.fc_convocation_exigibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin ON public.fc_convocation_exigibles FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE TABLE public.fc_convocation_envois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inscription_id uuid NOT NULL REFERENCES public.session_apprenants(id),
  apprenant_id uuid NOT NULL, session_id uuid NOT NULL, UNIQUE(apprenant_id,session_id),
  statut text NOT NULL DEFAULT 'pret' CHECK(statut IN('pret','en_cours','envoye','echec','indetermine','a_revoir')),
  tentatives integer NOT NULL DEFAULT 0, prochain_essai timestamptz NOT NULL DEFAULT now(),
  claim_id uuid, claim_at timestamptz, termine_at timestamptz,
  provider_id text, erreur text, snapshot jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fc_convocation_envois TO authenticated;
GRANT ALL ON public.fc_convocation_envois TO service_role;
ALTER TABLE public.fc_convocation_envois ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin ON public.fc_convocation_envois FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX fc_convocation_due ON public.fc_convocation_envois(prochain_essai) WHERE statut IN('pret','echec');

CREATE TABLE public.fc_convocation_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), envoi_id uuid REFERENCES public.fc_convocation_envois(id),
  inscription_id uuid NOT NULL, evenement text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fc_convocation_journal TO authenticated;
GRANT ALL ON public.fc_convocation_journal TO service_role;
ALTER TABLE public.fc_convocation_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin ON public.fc_convocation_journal FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.fc_convocation_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Historique convocation conservé' USING ERRCODE='P0520'; END $$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.fc_convocation_rapprochements FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_immuable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.fc_convocation_exigibles FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_immuable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.fc_convocation_journal FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_immuable();
CREATE TRIGGER no_delete BEFORE DELETE ON public.fc_convocation_envois FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_immuable();

-- Internal server-only eligibility: every read fails closed. No client eligibility boolean.
CREATE FUNCTION public.fc_convocation_controle(p_inscription uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE i record; s record; a record; cfg record; ex record; total numeric; motif text;
BEGIN
  SELECT * INTO cfg FROM fc_convocation_config WHERE id;
  SELECT * INTO i FROM session_apprenants WHERE id=p_inscription;
  IF i.id IS NULL THEN RETURN jsonb_build_object('eligible',false,'motif','Inscription absente'); END IF;
  SELECT * INTO s FROM sessions WHERE id=i.session_id;
  SELECT * INTO a FROM apprenants WHERE id=i.apprenant_id;
  SELECT * INTO ex FROM fc_convocation_exigibles WHERE inscription_id=i.id;
  IF s.nom !~* 'formation\s+continue.*(taxi|vtc)' OR s.nom IS NULL THEN motif:='Session hors FC';
  ELSIF i.liste_attente OR a.deleted_at IS NOT NULL OR a.abandonnee OR s.statut='annulee' THEN motif:='Inscription indisponible';
  ELSIF coalesce(i.date_debut,s.date_debut) IS NULL OR coalesce(i.date_fin_personnalisee,i.date_fin,s.date_fin) IS NULL
    OR coalesce(i.date_fin_personnalisee,i.date_fin,s.date_fin)<coalesce(i.date_debut,s.date_debut)
    OR coalesce(i.date_debut,s.date_debut)<=(now() AT TIME ZONE 'Europe/Paris')::date
    OR nullif(btrim(s.lieu),'') IS NULL
    OR nullif(coalesce(i.heure_debut_personnalisee,s.heure_debut),'') IS NULL
    OR nullif(coalesce(i.heure_fin_personnalisee,s.heure_fin),'') IS NULL
    OR coalesce(i.heure_debut_personnalisee,s.heure_debut)>=coalesce(i.heure_fin_personnalisee,s.heure_fin) THEN motif:='Session incomplète ou commencée';
  ELSIF a.emails_bloques OR a.email IS NULL OR a.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN motif:='Destinataire indisponible';
  ELSIF NOT coalesce(cfg.actif,false) OR cfg.actif_depuis IS NULL THEN motif:='Envoi désactivé';
  ELSIF ex.inscription_id IS NULL OR ex.montant>i.montant_total OR i.montant_total IS NULL THEN motif:='Montant contractuel non prouvé';
  -- Legacy email history is not session-scoped: conservative review, never guessed.
  ELSIF EXISTS(SELECT 1 FROM emails e WHERE e.apprenant_id=a.id AND (e.subject ILIKE '%convocation%' OR e.subject ILIKE '%confirmation%formation%continue%')) THEN motif:='Historique de convocation à vérifier';
  ELSIF EXISTS(SELECT 1 FROM fc_convocation_rapprochements r JOIN transactions_bancaires t ON t.id=r.transaction_id
    WHERE r.inscription_id=i.id AND (t.montant<=0 OR t.libelle ~* 'rembours|refund|reversal')) THEN motif:='Remboursement';
  ELSIF NOT EXISTS(SELECT 1 FROM fc_convocation_rapprochements WHERE inscription_id=i.id) THEN motif:='Rapprochement absent';
  ELSIF EXISTS(SELECT 1 FROM fc_convocation_rapprochements r JOIN transactions_bancaires t ON t.id=r.transaction_id
    WHERE r.inscription_id=i.id AND (nullif(btrim(t.reference),'') IS NULL OR nullif(btrim(t.banque),'') IS NULL
      OR t.statut NOT IN('justifie','rapproche') OR t.statut IS NULL OR t.categorie IS DISTINCT FROM 'recette_formation')) THEN motif:='Paiement non confirmé ou référence absente';
  ELSIF EXISTS(SELECT 1 FROM fc_convocation_rapprochements r JOIN transactions_bancaires t ON t.id=r.transaction_id
    JOIN transactions_bancaires d ON lower(btrim(d.banque))=lower(btrim(t.banque)) AND lower(btrim(d.reference))=lower(btrim(t.reference))
    LEFT JOIN fc_convocation_rapprochements dr ON dr.transaction_id=d.id
    WHERE r.inscription_id=i.id AND (d.montant<>t.montant OR d.date_operation<>t.date_operation OR (dr.inscription_id IS NOT NULL AND dr.inscription_id<>i.id))) THEN motif:='Doublon contradictoire ou paiement multi-session';
  END IF;
  IF motif IS NOT NULL THEN RETURN jsonb_build_object('eligible',false,'motif',motif); END IF;
  SELECT coalesce(sum(montant),0) INTO total FROM (
    SELECT DISTINCT lower(btrim(t.banque)),lower(btrim(t.reference)),t.montant
    FROM fc_convocation_rapprochements r JOIN transactions_bancaires t ON t.id=r.transaction_id
    WHERE r.inscription_id=i.id AND t.date_operation>(cfg.actif_depuis AT TIME ZONE 'Europe/Paris')::date
      AND t.created_at>=cfg.actif_depuis
  ) dedup;
  IF total<ex.montant THEN RETURN jsonb_build_object('eligible',false,'motif','Acompte insuffisant ou paiement historique'); END IF;
  RETURN jsonb_build_object('eligible',true,'montant',total,'exigible',ex.montant,'inscription',to_jsonb(i),
    'session',to_jsonb(s),'stagiaire',jsonb_build_object('id',a.id,'nom',a.nom,'prenom',a.prenom,'email',a.email,
       'civilite',a.civilite,'adresse',a.adresse,'code_postal',a.code_postal,'ville',a.ville));
END $$;
REVOKE ALL ON FUNCTION public.fc_convocation_controle(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fc_convocation_controle(uuid) TO service_role;

CREATE FUNCTION public.fc_convocation_preparer(p_inscription uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE preuve jsonb; eid uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('fc-convocation:'||p_inscription,0));
  preuve:=fc_convocation_controle(p_inscription);
  IF NOT coalesce((preuve->>'eligible')::boolean,false) THEN RETURN NULL; END IF;
  INSERT INTO fc_convocation_envois(inscription_id,apprenant_id,session_id)
  VALUES(p_inscription,(preuve#>>'{stagiaire,id}')::uuid,(preuve#>>'{session,id}')::uuid)
  ON CONFLICT(apprenant_id,session_id) DO NOTHING RETURNING id INTO eid;
  IF eid IS NOT NULL THEN INSERT INTO fc_convocation_journal(envoi_id,inscription_id,evenement) VALUES(eid,p_inscription,'prepare'); END IF;
  RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.fc_convocation_preparer(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fc_convocation_preparer(uuid) TO service_role;

-- Trigger only prepares the outbox; does not mutate payments/dossiers or send HTTP.
CREATE FUNCTION public.fc_convocation_apres_rapprochement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE iid uuid;
BEGIN
  IF TG_TABLE_NAME='transactions_bancaires' THEN
    FOR iid IN SELECT inscription_id FROM fc_convocation_rapprochements WHERE transaction_id=NEW.id LOOP PERFORM fc_convocation_preparer(iid); END LOOP;
  ELSE PERFORM fc_convocation_preparer(NEW.inscription_id); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fc_convocation_tx AFTER UPDATE OF statut,categorie ON public.transactions_bancaires FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_apres_rapprochement();
CREATE TRIGGER fc_convocation_proof AFTER INSERT ON public.fc_convocation_rapprochements FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_apres_rapprochement();
CREATE TRIGGER fc_convocation_contract AFTER INSERT ON public.fc_convocation_exigibles FOR EACH ROW EXECUTE FUNCTION public.fc_convocation_apres_rapprochement();

CREATE FUNCTION public.fc_convocation_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e record; preuve jsonb; claim uuid:=gen_random_uuid(); m record;
BEGIN
  IF NOT coalesce((SELECT actif FROM fc_convocation_config WHERE id),false) THEN RETURN NULL; END IF;
  -- A crashed request is uncertain, never reclaimed automatically.
  FOR e IN SELECT * FROM fc_convocation_envois WHERE statut='en_cours' AND claim_at<now()-interval '10 minutes' FOR UPDATE SKIP LOCKED LOOP
    UPDATE fc_convocation_envois SET statut='indetermine',erreur='Interruption : livraison inconnue' WHERE id=e.id;
    INSERT INTO fc_convocation_journal(envoi_id,inscription_id,evenement) VALUES(e.id,e.inscription_id,'indetermine');
    INSERT INTO alertes_systeme(type,titre,message,details,lu) VALUES('convocation_fc','Convocation FC à vérifier','Livraison inconnue : aucun renvoi automatique',e.id::text,false);
  END LOOP;
  SELECT * INTO e FROM fc_convocation_envois WHERE statut IN('pret','echec') AND prochain_essai<=now() AND tentatives<3 ORDER BY prochain_essai,id LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF e.id IS NULL THEN RETURN NULL; END IF;
  preuve:=fc_convocation_controle(e.inscription_id);
  SELECT subject_template,body_template INTO m FROM email_templates WHERE id='confirmation-formation-continue';
  IF NOT coalesce((preuve->>'eligible')::boolean,false) OR m.body_template IS NULL THEN
    UPDATE fc_convocation_envois SET statut='a_revoir',erreur=coalesce(preuve->>'motif','Modèle absent') WHERE id=e.id;
    INSERT INTO fc_convocation_journal(envoi_id,inscription_id,evenement,details) VALUES(e.id,e.inscription_id,'a_revoir',jsonb_build_object('motif',coalesce(preuve->>'motif','Modèle absent')));
    INSERT INTO alertes_systeme(type,titre,message,details,lu) VALUES('convocation_fc','Convocation FC bloquée','Éligibilité ou modèle à vérifier',e.id::text,false);
    RETURN NULL;
  END IF;
  preuve:=preuve||jsonb_build_object('modele',to_jsonb(m));
  UPDATE fc_convocation_envois SET statut='en_cours',tentatives=tentatives+1,claim_id=claim,claim_at=now(),snapshot=preuve WHERE id=e.id;
  INSERT INTO fc_convocation_journal(envoi_id,inscription_id,evenement) VALUES(e.id,e.inscription_id,'claim');
  RETURN preuve||jsonb_build_object('envoi_id',e.id,'claim_id',claim);
END $$;
REVOKE ALL ON FUNCTION public.fc_convocation_claim() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fc_convocation_claim() TO service_role;

CREATE FUNCTION public.fc_convocation_finir(p_envoi uuid,p_claim uuid,p_statut text,p_provider text DEFAULT NULL,p_erreur text DEFAULT NULL,p_message jsonb DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e record;
BEGIN
  IF p_statut NOT IN('envoye','echec','indetermine','a_revoir') OR (p_statut='envoye' AND nullif(p_provider,'') IS NULL) THEN RAISE EXCEPTION 'Résultat invalide'; END IF;
  SELECT * INTO e FROM fc_convocation_envois WHERE id=p_envoi AND claim_id=p_claim AND statut='en_cours' FOR UPDATE;
  IF e.id IS NULL THEN RETURN false; END IF;
  UPDATE fc_convocation_envois SET statut=p_statut,provider_id=p_provider,erreur=left(p_erreur,300),termine_at=now(),
    prochain_essai=now()+make_interval(mins=>5*e.tentatives) WHERE id=e.id;
  INSERT INTO fc_convocation_journal(envoi_id,inscription_id,evenement,details) VALUES(e.id,e.inscription_id,p_statut,
    jsonb_build_object('provider_id',p_provider,'erreur',left(p_erreur,300),'message',p_message));
  IF p_statut='envoye' THEN
    INSERT INTO emails(apprenant_id,type,recipients,subject,body_html,sent_at)
    VALUES(e.apprenant_id,'sent',ARRAY[e.snapshot#>>'{stagiaire,email}'],p_message->>'subject',p_message->>'html',now());
  ELSE
    INSERT INTO alertes_systeme(type,titre,message,details,lu) VALUES('convocation_fc','Échec convocation FC',
      CASE WHEN p_statut='echec' AND e.tentatives<3 THEN 'Refus fournisseur : réessai borné prévu' ELSE 'Vérification manuelle nécessaire, aucun renvoi aveugle' END,e.id::text,false);
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fc_convocation_finir(uuid,uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fc_convocation_finir(uuid,uuid,text,text,text,jsonb) TO service_role;
-- No cron created here. Scheduling + activation require separate approval.