CREATE TABLE public.fc_signatures_papier (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inscription_id uuid NOT NULL REFERENCES public.session_apprenants(id),
 apprenant_id uuid NOT NULL REFERENCES public.apprenants(id), session_id uuid NOT NULL REFERENCES public.sessions(id),
 document_id uuid NOT NULL REFERENCES public.documents_inscription(id), date_presence date NOT NULL,
 creneau text NOT NULL CHECK (creneau IN ('matin','apres_midi')), heures numeric NOT NULL CHECK (heures>0 AND heures<=4),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(inscription_id,date_presence,creneau)
);
GRANT SELECT,INSERT ON public.fc_signatures_papier TO authenticated;
GRANT SELECT ON public.fc_signatures_papier TO service_role;
ALTER TABLE public.fc_signatures_papier ENABLE ROW LEVEL SECURITY;
CREATE POLICY fc_papier_admin_read ON public.fc_signatures_papier FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY fc_papier_admin_insert ON public.fc_signatures_papier FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin') AND created_by=auth.uid());
CREATE FUNCTION public.fc_papier_garde() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; doc record; maxh numeric;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Preuve papier immuable' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 SELECT sa.*, se.nom, se.date_debut AS dd,se.date_fin AS df,se.heure_debut,se.heure_fin INTO s FROM session_apprenants sa JOIN sessions se ON se.id=sa.session_id WHERE sa.id=NEW.inscription_id;
 IF s.id IS NULL OR s.apprenant_id<>NEW.apprenant_id OR s.session_id<>NEW.session_id OR s.nom NOT ILIKE '%formation continue%' OR coalesce(s.liste_attente,false) OR coalesce(s.emargements_exclus,false) THEN RAISE EXCEPTION 'Inscription FC invalide'; END IF;
 IF NEW.date_presence < greatest(s.dd::date,coalesce(s.date_debut::date,s.dd::date)) OR NEW.date_presence > least(coalesce(s.df,s.dd)::date,coalesce(s.date_fin_personnalisee,s.date_fin,s.df,s.dd)::date) OR NEW.date_presence>(now() AT TIME ZONE 'Europe/Paris')::date OR extract(isodow FROM NEW.date_presence)>5 THEN RAISE EXCEPTION 'Date hors inscription'; END IF;
 SELECT * INTO doc FROM documents_inscription WHERE id=NEW.document_id AND apprenant_id=NEW.apprenant_id;
 IF doc.id IS NULL OR coalesce(doc.url,'')='' OR coalesce(doc.statut,'') IN ('refuse','refusee') OR doc.type_document='attestation-fc' THEN RAISE EXCEPTION 'Document justificatif du dossier requis'; END IF;
 maxh:=CASE WHEN NEW.creneau='matin' THEN greatest(0,extract(epoch FROM (least(coalesce(s.heure_fin_personnalisee,s.heure_fin,'17:00')::time,'12:00'::time)-greatest(coalesce(s.heure_debut_personnalisee,s.heure_debut,'09:00')::time,'09:00'::time)))/3600) ELSE greatest(0,extract(epoch FROM (least(coalesce(s.heure_fin_personnalisee,s.heure_fin,'17:00')::time,'17:00'::time)-greatest(coalesce(s.heure_debut_personnalisee,s.heure_debut,'09:00')::time,'13:00'::time)))/3600) END;
 IF NEW.heures>maxh OR maxh<=0 THEN RAISE EXCEPTION 'Heures superieures au creneau inscrit'; END IF;
 NEW.created_at:=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fc_papier_garde() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fc_papier_garde BEFORE INSERT OR UPDATE OR DELETE ON public.fc_signatures_papier FOR EACH ROW EXECUTE FUNCTION public.fc_papier_garde();
CREATE FUNCTION public.fc_papier_creneaux(p_apprenant uuid) RETURNS TABLE(id uuid,date_emargement date,demi_journee text,heures numeric,document_id uuid,session_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT (coalesce(public.has_role(auth.uid(),'admin'),false) OR EXISTS(SELECT 1 FROM apprenants WHERE apprenants.id=p_apprenant AND auth_user_id=auth.uid())) THEN RAISE EXCEPTION 'Acces refuse' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.id,p.date_presence,p.creneau,p.heures,p.document_id,p.session_id FROM fc_signatures_papier p JOIN documents_inscription d ON d.id=p.document_id WHERE p.apprenant_id=p_apprenant AND coalesce(d.url,'')<>'' AND coalesce(d.statut,'') NOT IN ('refuse','refusee');
END $$;
REVOKE ALL ON FUNCTION public.fc_papier_creneaux(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fc_papier_creneaux(uuid) TO authenticated;
-- Verrou attestations formation continue : 4 signatures serveur (matin + après-midi de chaque jour de la session FC).
CREATE OR REPLACE FUNCTION public.attestation_fc_controle(p_apprenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s record; d date; c text; attendu numeric; manquants jsonb := '[]'::jsonb; requis int := 0; signes int := 0;
BEGIN
  IF p_apprenant IS NULL THEN RETURN jsonb_build_object('autorise', false, 'motif', 'Apprenant inconnu', 'manquants', '[]'::jsonb); END IF;
  SELECT se.id, se.nom, se.heure_debut, se.heure_fin, se.date_debut::date AS dd, coalesce(se.date_fin, se.date_debut)::date AS df INTO s
  FROM session_apprenants sa JOIN sessions se ON se.id = sa.session_id
  WHERE sa.apprenant_id = p_apprenant AND coalesce(sa.liste_attente, false) = false
    AND se.nom ILIKE '%formation continue%' AND se.date_debut IS NOT NULL
  ORDER BY se.date_debut DESC LIMIT 1;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('autorise', false, 'motif', 'Aucune session de formation continue trouvée', 'manquants', '[]'::jsonb);
  END IF;
  FOR d IN SELECT g::date FROM generate_series(s.dd, s.df, interval '1 day') g WHERE extract(isodow FROM g) < 6 LOOP
    FOREACH c IN ARRAY ARRAY['matin','apres_midi'] LOOP
      requis := requis + 1;
      attendu := CASE WHEN c='matin' THEN 3 ELSE 4 END;
      IF EXISTS (SELECT 1 FROM emargements_fc e WHERE e.apprenant_id = p_apprenant AND e.date_emargement = d AND e.demi_journee = c
                 AND coalesce(e.masque, false) = false AND coalesce(e.absent, false) = false AND e.signed_at IS NOT NULL
                 AND e.signature_data_url ~* '^data:image/(png|jpeg|jpg);base64,[a-z0-9+/=[:space:]]+$'
                 AND length(e.signature_data_url) > 200) OR EXISTS (SELECT 1 FROM fc_signatures_papier p JOIN documents_inscription doc ON doc.id=p.document_id WHERE p.apprenant_id=p_apprenant AND p.session_id=s.id AND p.date_presence=d AND p.creneau=c AND p.heures=attendu AND coalesce(doc.url,'')<>'' AND coalesce(doc.statut,'') NOT IN ('refuse','refusee')) THEN
        signes := signes + 1;
      ELSE
        manquants := manquants || jsonb_build_object('date', d, 'creneau', c);
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('autorise', requis > 0 AND signes = requis, 'requis', requis, 'signes', signes,
    'session_id', s.id, 'session', s.nom, 'manquants', manquants,
    'motif', CASE WHEN requis = 0 THEN 'Aucun jour de formation dans la session' WHEN signes = requis THEN NULL ELSE 'Émargements manquants' END);
END $$;
