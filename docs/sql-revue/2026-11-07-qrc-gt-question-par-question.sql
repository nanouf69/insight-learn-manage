-- Reprise G(T) e-learning, question par question — candidat testé sur PostgreSQL jetable.
-- Aucune donnée pédagogique, réponse, note ou trace initiale n'est modifiée.
-- Seule nouvelle capacité : une trace exclue/matiere_exclue_gt peut ouvrir UNE reprise append-only.

CREATE OR REPLACE FUNCTION public.qrc_ia_identite_compte_test(p_nom text, p_prenom text, p_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT lower(concat_ws(' ',coalesce(p_prenom,''),coalesce(p_nom,''),coalesce(p_email,'')))
   ~ '(fictif|d[ée]mo|test[ ._-]?technique|compte[ _-]?test|essai[ _-]?ia)'
$$;
REVOKE ALL ON FUNCTION public.qrc_ia_identite_compte_test(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_identite_compte_test(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.qrc_ia_raison_file(p_attempt uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; a record; ap record;
BEGIN
 SELECT * INTO c FROM public.qrc_ia_config WHERE id;
 IF NOT FOUND OR NOT c.actif OR c.actif_depuis IS NULL THEN RETURN 'ia_desactivee'; END IF;
 SELECT attempt_id, apprenant_id, etat, finished_at, is_test INTO a FROM public.exam_attempts_v2 WHERE attempt_id=p_attempt;
 IF NOT FOUND THEN RETURN 'passage_introuvable'; END IF;
 IF a.etat<>'terminee' OR a.finished_at IS NULL THEN RETURN 'passage_non_termine'; END IF;
 IF a.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN 'exclu'; END IF;
 SELECT type_apprenant,modalite_formation,nom,prenom,email,compte_cours_archive_at INTO ap FROM public.apprenants WHERE id=a.apprenant_id;
 IF NOT FOUND OR NOT public.qrc_ia_type_elearning(ap.type_apprenant,ap.modalite_formation) THEN RETURN 'non_elearning'; END IF;
 IF ap.compte_cours_archive_at IS NOT NULL THEN RETURN 'compte_archive'; END IF;
 IF a.is_test OR EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id)
    OR public.qrc_ia_identite_compte_test(ap.nom,ap.prenom,ap.email) THEN RETURN 'compte_test'; END IF;
 IF EXISTS(SELECT 1 FROM public.core_tentatives_neutralisees n WHERE n.attempt_id=p_attempt)
    OR EXISTS(SELECT 1 FROM public.core_exam_resets r WHERE r.archived_attempt_ids ? p_attempt::text) THEN RETURN 'passage_archive_ou_neutralise'; END IF;
 IF a.finished_at < greatest(c.actif_depuis,timestamptz '2026-10-20 09:53+00') THEN RETURN 'hors_periode'; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.qrc_instances_v2 q
   WHERE q.attempt_id=p_attempt AND q.etat='en_attente' AND q.reponse IS NOT NULL
     AND NOT EXISTS(SELECT 1 FROM public.qrc_ia_reprises r WHERE r.qrc_instance_id=q.qrc_instance_id)
     AND (NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id)
       OR EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id AND x.statut='exclue' AND x.motif='matiere_exclue_gt'))
 ) THEN RETURN 'rien_a_corriger'; END IF;
 RETURN 'admissible';
END $$;

CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_reprise(p_qrc uuid,p_base jsonb,p_interruption_confirmee boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.qrc_instances_v2; ancien public.qrc_ia_corrections; dernier public.qrc_ia_reprises; nouveau uuid; n integer; legacy_id uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=p_qrc FOR UPDATE;
 IF NOT FOUND OR q.etat<>'en_attente' OR q.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN NULL; END IF;
 IF p_base->>'attempt_id' IS DISTINCT FROM q.attempt_id::text OR p_base->>'apprenant_id' IS DISTINCT FROM q.apprenant_id::text OR p_base->>'question_id' IS DISTINCT FROM q.question_id THEN RAISE EXCEPTION 'Identite incoherente'; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND (NOT actif OR pause_depuis IS NOT NULL)) THEN RETURN NULL; END IF;
 SELECT * INTO dernier FROM public.qrc_ia_reprises WHERE qrc_instance_id=p_qrc ORDER BY numero DESC LIMIT 1;
 IF FOUND THEN
  IF dernier.numero>=2 OR dernier.statut<>'erreur' OR NOT (dernier.http_status=429 OR dernier.http_status>=500) OR dernier.termine_at IS NULL OR dernier.termine_at>now()-interval '30 seconds' THEN RETURN NULL; END IF;
  n:=dernier.numero+1;
 ELSE
  n:=1;
  SELECT * INTO ancien FROM public.qrc_ia_corrections WHERE qrc_instance_id=p_qrc LIMIT 1;
  IF FOUND THEN
   IF ancien.reponse_hash IS DISTINCT FROM p_base->>'reponse_hash' OR ancien.cle_idempotence IS DISTINCT FROM p_base->>'cle_idempotence' THEN RAISE EXCEPTION 'Version reponse incoherente'; END IF;
   IF NOT (
     (ancien.statut='erreur' AND (ancien.http_status=429 OR ancien.http_status>=500) AND ancien.termine_at<=now()-interval '30 seconds')
     OR (ancien.statut='en_cours' AND ancien.termine_at IS NULL AND p_interruption_confirmee AND ancien.created_at<=now()-interval '10 minutes')
     OR (ancien.statut='exclue' AND ancien.motif='matiere_exclue_gt' AND ancien.matiere='reglementation_taxi2' AND ancien.termine_at IS NOT NULL AND p_base->>'matiere'='reglementation_taxi2')
   ) THEN RETURN NULL; END IF;
  ELSE
   INSERT INTO public.qrc_ia_corrections(cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,exam_id,matiere,reponse_hash,modele,bareme,statut)
   VALUES(p_base->>'cle_idempotence',p_qrc,q.attempt_id,q.apprenant_id,q.question_id,p_base->>'exam_id',p_base->>'matiere',p_base->>'reponse_hash',p_base->>'modele',(p_base->>'bareme')::numeric,'en_cours')
   ON CONFLICT(cle_idempotence) DO NOTHING RETURNING id INTO legacy_id;
   IF legacy_id IS NULL THEN RETURN NULL; END IF;
  END IF;
 END IF;
 INSERT INTO public.qrc_ia_reprises(qrc_instance_id,base,numero) VALUES(p_qrc,p_base,n) RETURNING id INTO nouveau;
 RETURN nouveau;
END $$;

CREATE OR REPLACE FUNCTION public.qrc_ia_reconcilier() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; p record; r text; vus int:=0; en_file int:=0; reouv int:=0; nb_revue int; nb_attente int; nb_file int; cle text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(74201954) THEN RETURN jsonb_build_object('statut','verrou'); END IF;
 SELECT * INTO c FROM public.qrc_ia_config WHERE id;
 IF NOT FOUND OR NOT c.actif OR c.actif_depuis IS NULL THEN RETURN jsonb_build_object('statut','ia_desactivee'); END IF;
 FOR p IN
  SELECT DISTINCT a.attempt_id,a.finished_at
  FROM public.exam_attempts_v2 a
  JOIN public.apprenants ap ON ap.id=a.apprenant_id
  JOIN public.qrc_instances_v2 q ON q.attempt_id=a.attempt_id
  LEFT JOIN public.qrc_ia_suites s ON s.attempt_id=a.attempt_id
  WHERE a.etat='terminee' AND NOT a.is_test AND a.apprenant_id<>'c0844007-b999-4385-9665-918e5077c3b5'
    AND a.finished_at>=greatest(c.actif_depuis,timestamptz '2026-10-20 09:53+00') AND a.finished_at<now()-interval '2 minutes'
    AND public.qrc_ia_type_elearning(ap.type_apprenant,ap.modalite_formation)
    AND ap.compte_cours_archive_at IS NULL
    AND NOT public.qrc_ia_identite_compte_test(ap.nom,ap.prenom,ap.email)
    AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id)
    AND NOT EXISTS(SELECT 1 FROM public.core_tentatives_neutralisees n WHERE n.attempt_id=a.attempt_id)
    AND NOT EXISTS(SELECT 1 FROM public.core_exam_resets x WHERE x.archived_attempt_ids ? a.attempt_id::text)
    AND q.etat='en_attente' AND q.reponse IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.qrc_ia_reprises rr WHERE rr.qrc_instance_id=q.qrc_instance_id)
    AND (NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id)
      OR EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id AND x.statut='exclue' AND x.motif='matiere_exclue_gt'))
    AND (s.attempt_id IS NULL OR s.statut IN ('terminee','pause'))
  ORDER BY a.finished_at LIMIT 50
 LOOP
  vus:=vus+1; r:=public.qrc_ia_enfiler(p.attempt_id,'reconciliation');
  IF r='en_file' THEN en_file:=en_file+1; ELSIF r='reouverte' THEN reouv:=reouv+1; END IF;
 END LOOP;
 SELECT count(*) FILTER (WHERE b.statut='revue'),count(*) FILTER (WHERE b.statut='en_attente'),count(*) FILTER (WHERE b.statut IN ('en_file','en_cours'))
  INTO nb_revue,nb_attente,nb_file FROM public.qrc_ia_bilan_statuts() b WHERE b.finished_at<now()-interval '1 hour';
 IF nb_revue+nb_attente>0 OR en_file+reouv>0 THEN
  cle:='completude:'||to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD');
  IF NOT EXISTS(SELECT 1 FROM public.alertes_systeme WHERE type='qrc_ia_completude' AND details LIKE '%"cle": "'||cle||'"%') OR en_file+reouv>0 THEN
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_completude','Contrôle de complétude correction IA',
    nb_revue||' QRC en revue, '||nb_attente||' non mises en file, '||nb_file||' en file depuis plus d''1 h ; '||en_file||' passage(s) oublié(s) mis en file, '||reouv||' réouvert(s).',
    jsonb_build_object('cle',cle,'revue',nb_revue,'non_en_file',nb_attente,'en_file',nb_file,'mis_en_file',en_file,'reouverts',reouv)::text,false);
  END IF;
 END IF;
 RETURN jsonb_build_object('vus',vus,'mis_en_file',en_file,'reouverts',reouv,'revue',nb_revue,'non_en_file',nb_attente,'en_file',nb_file);
END $$;
