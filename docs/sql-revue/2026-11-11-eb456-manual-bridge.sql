-- EB4–6 only. Original rows and grades remain unchanged. No AI authorization.
CREATE TABLE public.eb456_raccordements_revue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 result_id uuid NOT NULL,
 apprenant_id uuid NOT NULL,
 exam_id text NOT NULL,
 matiere_id text NOT NULL,
 tentative integer NOT NULL,
 fingerprint text NOT NULL,
 raison text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(result_id,fingerprint,raison)
);
GRANT SELECT ON public.eb456_raccordements_revue TO authenticated;
GRANT ALL ON public.eb456_raccordements_revue TO service_role;
ALTER TABLE public.eb456_raccordements_revue ENABLE ROW LEVEL SECURITY;
CREATE POLICY eb456_revue_admin ON public.eb456_raccordements_revue FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.eb456_revue_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN RAISE EXCEPTION 'Journal de revue immuable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER eb456_revue_immuable BEFORE UPDATE OR DELETE ON public.eb456_raccordements_revue
 FOR EACH ROW EXECUTE FUNCTION public.eb456_revue_immuable();
REVOKE ALL ON FUNCTION public.eb456_revue_immuable() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.eb456_preuve_remise(p_result_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.apprenant_quiz_results; s public.reponses_apprenants; qs jsonb; q jsonb;
 k text; n integer; aid uuid; nb integer; uid uuid:=auth.uid();
BEGIN
 SELECT * INTO r FROM public.apprenant_quiz_results WHERE id=p_result_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('statut','revue','raison','source_absente'); END IF;
 IF uid IS NOT NULL AND NOT public.has_role(uid,'admin') AND NOT EXISTS(
  SELECT 1 FROM public.apprenants a WHERE a.id=r.apprenant_id AND a.auth_user_id=uid) THEN
  RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 IF r.quiz_type<>'examen_blanc' OR r.quiz_id !~* '^EB[456](-TAXI|-TA|-VA)?$' THEN
  RETURN jsonb_build_object('statut','hors_perimetre'); END IF;
 IF EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=r.apprenant_id)
 OR EXISTS(SELECT 1 FROM public.core_exam_resets z WHERE z.archived_legacy_result_ids ? r.id::text) THEN
  RETURN jsonb_build_object('statut','revue','raison','archive_ou_test'); END IF;
 SELECT count(*),min(a.attempt_id::text)::uuid INTO nb,aid FROM public.exam_attempts_v2 a
  WHERE a.snapshot->'source_historique'->>'result_id'=r.id::text;
 IF nb>0 THEN
  IF nb=1 AND EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.attempt_id=aid
   AND a.apprenant_id=r.apprenant_id AND a.exam_id=r.quiz_id AND a.etat='terminee'
   AND a.snapshot->'source_historique'->'details'=r.details
   AND a.snapshot->'source_historique'->>'tentative'=r.tentative::text) THEN
   RETURN jsonb_build_object('statut','deja_v2','attempt_id',aid);
  END IF;
  RETURN jsonb_build_object('statut','revue','raison','liaison_existante_divergente');
 END IF;
 IF r.completed_at IS NULL OR r.tentative IS NULL OR r.tentative<1 THEN
  RETURN jsonb_build_object('statut','revue','raison','tentative_ou_fin_absente'); END IF;
 IF r.details->>'qrc_pending_correction' IS DISTINCT FROM 'true' THEN
  RETURN jsonb_build_object('statut','revue','raison','validation_a_preserver'); END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_historique_corrections h WHERE h.result_id=r.id)
 OR EXISTS(SELECT 1 FROM jsonb_each(coalesce(r.details->'correctionsIA','{}')) c
  WHERE c.value->>'validatedByAdmin'='true' OR c.value->>'manuel'='true'
   OR nullif(c.value->>'correctedBy','') IS NOT NULL OR nullif(c.value->>'corrige_par','') IS NOT NULL)
 OR r.details ? 'correctionsQRC' OR r.details ? 'notesQRC' THEN
  RETURN jsonb_build_object('statut','revue','raison','correction_tracee_a_preserver'); END IF;
 qs:=r.details->'snapshot'->'questions';
 IF jsonb_typeof(qs) IS DISTINCT FROM 'array' OR jsonb_array_length(qs)=0
 OR jsonb_typeof(r.details->'reponses') IS DISTINCT FROM 'object'
 OR r.details->'snapshot'->>'examenId' IS DISTINCT FROM r.quiz_id
 OR r.details->'snapshot'->>'matiereId' IS DISTINCT FROM r.matiere_id THEN
  RETURN jsonb_build_object('statut','revue','raison','snapshot_identite_incomplet'); END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(qs))<>jsonb_array_length(qs)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(qs) x WHERE nullif(x->>'id','') IS NULL)
 OR (SELECT count(*) FROM jsonb_object_keys(r.details->'reponses'))<>jsonb_array_length(qs)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(qs) x WHERE NOT(r.details->'reponses' ? (x->>'id'))) THEN
  RETURN jsonb_build_object('statut','revue','raison','identites_ou_reponses_incompletes'); END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(qs) LOOP
  IF coalesce(q->>'type','') NOT IN ('QRC','QCM') OR nullif(q->>'enonce','') IS NULL
   OR coalesce(q->>'points','') !~ '^[0-9]+([.][0-9]+)?$' THEN
   RETURN jsonb_build_object('statut','revue','raison','contenu_ou_bareme_incomplet'); END IF;
  IF (q->>'points')::numeric<=0 OR (q->>'type'='QRC' AND nullif(q->>'reponseQRC','') IS NULL)
   OR (q->>'type'='QCM' AND (jsonb_typeof(q->'choix') IS DISTINCT FROM 'array')) THEN
   RETURN jsonb_build_object('statut','revue','raison','corrige_ou_bareme_absent'); END IF;
  IF q->>'type'='QCM' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true') THEN
   RETURN jsonb_build_object('statut','revue','raison','corrige_qcm_absent'); END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(qs) x WHERE x->>'type'='QRC') THEN
  RETURN jsonb_build_object('statut','hors_perimetre'); END IF;
 k:=r.quiz_id||'__'||r.matiere_id||CASE WHEN r.tentative>1 THEN '__t'||r.tentative ELSE '' END;
 SELECT count(*) INTO n FROM public.reponses_apprenants a WHERE a.apprenant_id=r.apprenant_id
  AND a.exercice_type='examen_blanc' AND a.exercice_id=k;
 IF n<>1 THEN RETURN jsonb_build_object('statut','revue','raison','remise_unique_absente'); END IF;
 SELECT * INTO s FROM public.reponses_apprenants a WHERE a.apprenant_id=r.apprenant_id
  AND a.exercice_type='examen_blanc' AND a.exercice_id=k;
 IF s.completed IS DISTINCT FROM true OR s.status IS DISTINCT FROM 'submitted' OR s.submitted_at IS NULL THEN
  RETURN jsonb_build_object('statut','revue','raison','remise_non_prouvee'); END IF;
 IF coalesce(s.tentative,1)<>r.tentative THEN
  RETURN jsonb_build_object('statut','revue','raison','compteur_suffixe_divergent'); END IF;
 IF s.user_id IS DISTINCT FROM r.user_id OR s.reponses IS DISTINCT FROM r.details->'reponses'
 OR (r.details ? 'source_exercice_id' AND r.details->>'source_exercice_id' IS DISTINCT FROM k)
 OR (r.details ? 'source_tentative' AND r.details->>'source_tentative' IS DISTINCT FROM r.tentative::text) THEN
  RETURN jsonb_build_object('statut','revue','raison','identite_ou_reponses_divergentes'); END IF;
 -- Another native copy is not a substitute for this source. No time-window matching.
 IF EXISTS(SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=r.apprenant_id AND a.exam_id=r.quiz_id
  AND coalesce(a.snapshot->>'matiere',a.snapshot->'matieres'->0->>'subject_id')=r.matiere_id
  AND (a.snapshot->>'tentative' IS NULL OR a.snapshot->>'tentative'=r.tentative::text)) THEN
  RETURN jsonb_build_object('statut','revue','raison','passage_v2_a_rapprocher'); END IF;
 RETURN jsonb_build_object('statut','prouve','submission_id',s.id,'exercice_id',k,
  'fingerprint',md5(jsonb_build_array(to_jsonb(r),to_jsonb(s))::text));
END $$;
REVOKE ALL ON FUNCTION public.eb456_preuve_remise(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.eb456_preuve_remise(uuid) TO authenticated,service_role;

CREATE FUNCTION public.eb456_raccorder_manuellement(p_result_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.apprenant_quiz_results; preuve jsonb; snap jsonb; qs jsonb;
 a uuid; v uuid; q jsonb; nb integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('eb456-manuel:'||p_result_id::text,0));
 SELECT * INTO r FROM public.apprenant_quiz_results WHERE id=p_result_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('statut','revue','raison','source_absente'); END IF;
 -- Lock received submission before re-reading proof. Neither source is rewritten.
 PERFORM 1 FROM public.reponses_apprenants s WHERE s.apprenant_id=r.apprenant_id
  AND s.exercice_id=r.quiz_id||'__'||r.matiere_id||CASE WHEN r.tentative>1 THEN '__t'||r.tentative ELSE '' END FOR UPDATE;
 preuve:=public.eb456_preuve_remise(r.id);
 IF preuve->>'statut'='revue' THEN
  INSERT INTO public.eb456_raccordements_revue(result_id,apprenant_id,exam_id,matiere_id,tentative,fingerprint,raison)
  VALUES(r.id,r.apprenant_id,r.quiz_id,r.matiere_id,coalesce(r.tentative,1),md5(to_jsonb(r)::text),preuve->>'raison')
  ON CONFLICT DO NOTHING;
 END IF;
 IF preuve->>'statut'<>'prouve' THEN RETURN preuve; END IF;
 SELECT id INTO v FROM public.exam_content_versions WHERE exam_id=r.quiz_id AND statut='publiee'
  ORDER BY version_number DESC LIMIT 1;
 IF v IS NULL THEN RETURN jsonb_build_object('statut','revue','raison','version_reference_absente'); END IF;
 -- Preserve EVERY frozen question field, including images, size, explanations and choice order.
 SELECT jsonb_agg(x||jsonb_build_object('id',x->>'id','matiere',r.matiere_id) ORDER BY ord)
  INTO qs FROM jsonb_array_elements(r.details->'snapshot'->'questions') WITH ORDINALITY t(x,ord);
 snap:=jsonb_build_object('exam_id',r.quiz_id,'matiere',r.matiere_id,'tentative',r.tentative,
  'correction_manuelle_exclusivement',true,'questions',qs,
  'matieres',jsonb_build_array(jsonb_build_object('subject_id',r.matiere_id,'titre',r.matiere_nom,
   'ordre',1,'coefficient',r.details->'snapshot'->'coefficient','note_sur',r.details->'snapshot'->'noteSur',
   'note_eliminatoire',r.details->'snapshot'->'noteEliminatoire','duree',r.details->'snapshot'->'duree',
   'pts_qcm',r.details->'snapshot'->'ptsQCM','pts_qrc',r.details->'snapshot'->'ptsQRC')),
  'source_historique',jsonb_build_object('origine','import-historique','result_id',r.id,
   'tentative',r.tentative,'completed_at',r.completed_at,'details',r.details,
   'preuve_remise',preuve,'reference_version_non_source',v));
 INSERT INTO public.exam_attempts_v2(apprenant_id,exam_id,exam_version_id,snapshot,snapshot_fingerprint,started_at,etat,is_test)
  VALUES(r.apprenant_id,r.quiz_id,v,snap,md5(snap::text),r.completed_at,'en_cours',false) RETURNING attempt_id INTO a;
 FOR q IN SELECT value FROM jsonb_array_elements(qs) LOOP
  INSERT INTO public.answer_state(attempt_id,apprenant_id,question_id,valeur,revision,session_origine)
   VALUES(a,r.apprenant_id,q->>'id',r.details->'reponses'->(q->>'id'),1,'import-historique');
  IF q->>'type'='QRC' THEN
   INSERT INTO public.qrc_instances_v2(attempt_id,apprenant_id,question_id,reponse,etat)
    VALUES(a,r.apprenant_id,q->>'id',r.details->'reponses'->(q->>'id'),'en_attente'); nb:=nb+1;
  END IF;
 END LOOP;
 UPDATE public.exam_attempts_v2 SET etat='terminee',finished_at=r.completed_at WHERE attempt_id=a;
 INSERT INTO public.audit_journal(operation,cible_type,cible_id,exam_id,exam_version_id,attempt_id,apprenant_id,auteur,apres,origine)
 VALUES('EB456_RACCORDEMENT_MANUEL','exam_attempt_v2',a::text,r.quiz_id,v,a,r.apprenant_id,auth.uid(),
  jsonb_build_object('result_id',r.id,'matiere_id',r.matiere_id,'tentative',r.tentative,'qrc',nb,'preuve',preuve),'import-historique');
 RETURN jsonb_build_object('statut','importe','attempt_id',a,'result_id',r.id,'qrc',nb);
END $$;
REVOKE ALL ON FUNCTION public.eb456_raccorder_manuellement(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.eb456_raccorder_manuellement(uuid) TO authenticated,service_role;

-- Durable hooks cover either write order and ACK loss. Errors never undo the learner's submission.
CREATE FUNCTION public.eb456_raccordement_apres_remise() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r record;
BEGIN
 IF TG_TABLE_NAME='apprenant_quiz_results' THEN
  IF NEW.quiz_type='examen_blanc' AND NEW.quiz_id ~* '^EB[456](-TAXI|-TA|-VA)?$' THEN
   PERFORM public.eb456_raccorder_manuellement(NEW.id);
  END IF;
 ELSE
  IF NEW.exercice_type='examen_blanc' AND NEW.completed AND NEW.status='submitted'
   AND NEW.exercice_id ~* '^EB[456](-TAXI|-TA|-VA)?__' THEN
   FOR r IN SELECT q.id FROM public.apprenant_quiz_results q WHERE q.apprenant_id=NEW.apprenant_id
    AND q.quiz_id ~* '^EB[456](-TAXI|-TA|-VA)?$' AND NEW.exercice_id=q.quiz_id||'__'||q.matiere_id
     ||CASE WHEN q.tentative>1 THEN '__t'||q.tentative ELSE '' END LOOP
    PERFORM public.eb456_raccorder_manuellement(r.id);
   END LOOP;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.eb456_raccordement_apres_remise() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_zzzz_eb456_raccordement_result AFTER INSERT OR UPDATE ON public.apprenant_quiz_results
 FOR EACH ROW EXECUTE FUNCTION public.eb456_raccordement_apres_remise();
CREATE TRIGGER trg_zzzz_eb456_raccordement_remise AFTER INSERT OR UPDATE ON public.reponses_apprenants
 FOR EACH ROW EXECUTE FUNCTION public.eb456_raccordement_apres_remise();