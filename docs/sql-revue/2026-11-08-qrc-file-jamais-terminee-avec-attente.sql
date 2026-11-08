-- Correctif technique de complétude : aucune note/réponse/corrigé n'est modifié.
-- Une suite « terminee » avec des QRC encore en attente devient « a_verifier »,
-- sans appel IA, y compris pour les réponses vides et exclusions non reprenables.
CREATE OR REPLACE FUNCTION public.qrc_ia_enfiler(p_attempt uuid, p_origine text DEFAULT 'serveur') RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r text; s public.qrc_ia_suites; ins uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND current_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 r := public.qrc_ia_raison_file(p_attempt);
 IF r<>'admissible' THEN
  IF r IN ('rien_a_corriger','hors_periode') THEN
   UPDATE public.qrc_ia_suites qcs SET statut='a_verifier',
    message='QRC encore en attente mais non admissibles à une reprise automatique',
    dernier_code='qrc_en_attente_non_admissible', maj_at=now()
    WHERE qcs.attempt_id=p_attempt AND qcs.statut='terminee'
      AND EXISTS(SELECT 1 FROM public.qrc_instances_v2 q WHERE q.attempt_id=p_attempt AND q.etat='en_attente')
   RETURNING qcs.attempt_id INTO ins;
   IF ins IS NOT NULL THEN
    INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES(
     'qrc_ia_suite','Correction QRC à vérifier',
     'La file était terminée à tort alors que des QRC restent en attente ; aucune note ni nouvel appel IA.',
     jsonb_build_object('attempt_id',p_attempt,'code','qrc_en_attente_non_admissible')::text,false);
    RETURN 'revue_qrc_en_attente';
   END IF;
  END IF;
  RETURN r;
 END IF;
 INSERT INTO public.qrc_ia_suites(attempt_id, origine, maj_at, dernier_code) VALUES(p_attempt, left(p_origine,40), now(), 'en_file')
 ON CONFLICT (attempt_id) DO NOTHING RETURNING attempt_id INTO ins;
 IF ins IS NOT NULL THEN RETURN 'en_file'; END IF;
 SELECT * INTO s FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF s.statut IN ('attente','en_cours') THEN RETURN 'deja_en_file'; END IF;
 IF s.statut='terminee' OR (s.statut='pause' AND EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL)) THEN
  IF s.remaining<=0 THEN
   UPDATE public.qrc_ia_suites SET statut='a_verifier', message='Budget épuisé alors que des QRC admissibles restent', dernier_code='budget_epuise', maj_at=now() WHERE attempt_id=p_attempt;
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Budget de continuation épuisé avec des QRC restantes.',jsonb_build_object('attempt_id',p_attempt,'code','budget_epuise')::text,false);
   RETURN 'revue_budget';
  END IF;
  UPDATE public.qrc_ia_suites SET statut='attente', next_at=now(), dispatches=0, lease_until=NULL,
   message='Réouverte ('||left(p_origine,40)||') : QRC admissibles sans trace', dernier_code='reouverte', maj_at=now() WHERE attempt_id=p_attempt;
  RETURN 'reouverte';
 END IF;
 RETURN 'revue_existante';
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_enfiler(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_enfiler(uuid,text) TO service_role;

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
    AND q.etat='en_attente' AND (q.reponse IS NOT NULL OR s.statut='terminee')
    AND NOT EXISTS(SELECT 1 FROM public.qrc_ia_reprises rr WHERE rr.qrc_instance_id=q.qrc_instance_id)
    AND (NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id)
      OR EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id AND x.statut='exclue' AND x.motif IN ('matiere_exclue_gt','reponse_vide')))
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
REVOKE ALL ON FUNCTION public.qrc_ia_reconcilier() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_reconcilier() TO service_role;
