-- REVIEW ONLY. No deployment. Owner's submitted original snapshot 5/505 or 5/506 only.
-- Reads the saved editor, not a published EB bank. Never writes learner evidence.
CREATE FUNCTION public.bilan_vtc_fg_training_read(p_type text,p_source uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE snap public.bilan_passage_snapshots; original public.reponses_apprenants;
 latest jsonb; ex jsonb; editor_at timestamptz; candidates jsonb; h jsonb; a jsonb;
 out_rows jsonb:='[]'; unavailable integer:=0; k text;
BEGIN
 IF auth.uid() IS NULL OR p_type IS DISTINCT FROM 'snapshot' THEN RAISE EXCEPTION 'OWN_SUBMITTED_SNAPSHOT_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT s.* INTO snap FROM public.bilan_passage_snapshots s JOIN public.apprenants ap ON ap.id=s.apprenant_id
 WHERE s.id=p_source AND ap.auth_user_id=auth.uid() AND s.module_id=5 AND s.exercice_id IN (505,506);
 IF snap.id IS NULL OR snap.passage_cle IS DISTINCT FROM 'module_5_exo_'||snap.exercice_id THEN RAISE EXCEPTION 'OWN_SUBMITTED_SNAPSHOT_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT r.* INTO original FROM public.reponses_apprenants r WHERE r.apprenant_id=snap.apprenant_id
 AND r.exercice_id=snap.passage_cle AND r.tentative=snap.tentative AND r.status='submitted' AND r.submitted_at IS NOT NULL;
 IF original.submitted_at IS NULL THEN RAISE EXCEPTION 'SUBMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT r.reponses INTO latest FROM public.reponses_apprenants r WHERE r.apprenant_id=snap.apprenant_id
 AND r.exercice_id='module_5_revision_exo_'||snap.exercice_id AND r.tentative=snap.tentative
 AND r.created_at>=original.submitted_at AND r.updated_at>=original.submitted_at;
 SELECT m.updated_at,(SELECT jsonb_agg(e) FROM jsonb_array_elements(m.module_data->'exercices') e WHERE e->>'id'=snap.exercice_id::text AND coalesce(e->>'actif','true')<>'false')
 INTO editor_at,candidates FROM public.module_editor_state m WHERE m.module_id=5;
 IF editor_at IS NULL OR jsonb_array_length(candidates) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'EDITOR_UNVERIFIED'; END IF;
 ex:=candidates->0;
 FOR h IN SELECT q FROM jsonb_array_elements(snap.questions) q LOOP
  k:=h->>'cle';
  SELECT jsonb_agg(q) INTO candidates FROM jsonb_array_elements(ex->'questions') q WHERE q->>'uid'=h->>'uid' AND coalesce(q->>'actif','true')<>'false';
  a:=candidates->0;
  IF nullif(h->>'uid','') IS NULL OR jsonb_array_length(candidates) IS DISTINCT FROM 1
   OR (SELECT count(*) FROM jsonb_array_elements(snap.questions) q WHERE q->>'uid'=h->>'uid')<>1
   OR coalesce(h->>'question_id','') !~ '^[0-9]{1,9}$'
   OR k IS DISTINCT FROM snap.exercice_id||'-'||(h->>'question_id')
   OR h->>'type' IS DISTINCT FROM 'QCM' OR a->>'type' IS DISTINCT FROM 'QCM'
   OR h->>'enonce' IS DISTINCT FROM a->>'enonce'
   OR jsonb_array_length(h->'choix')<1
   OR (SELECT count(DISTINCT c->>'lettre') FROM jsonb_array_elements(h->'choix') c)<>jsonb_array_length(h->'choix')
   OR (SELECT count(DISTINCT c->>'lettre') FROM jsonb_array_elements(a->'choix') c)<>jsonb_array_length(a->'choix')
   OR (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre') FROM jsonb_array_elements(h->'choix') c)
      IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre') FROM jsonb_array_elements(a->'choix') c)
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a->'choix') c WHERE c->>'correct'='true') THEN
   unavailable:=unavailable+1; CONTINUE;
  END IF;
  out_rows:=out_rows||jsonb_build_array(jsonb_build_object('uid',h->>'uid','id',(h->>'question_id')::int,'enonce',h->'enonce',
   'choix',(SELECT jsonb_agg(jsonb_build_object('lettre',c->>'lettre','texte',c->>'texte') ORDER BY n) FROM jsonb_array_elements(h->'choix') WITH ORDINALITY x(c,n)),
   'correct',(SELECT jsonb_agg(c->>'lettre' ORDER BY c->>'lettre') FROM jsonb_array_elements(a->'choix') c WHERE c->>'correct'='true'),
   'answer',CASE WHEN latest ? k THEN latest->k ELSE coalesce(original.reponses->k,'[]') END));
 END LOOP;
 RETURN jsonb_build_object('source_type','snapshot','source_id',p_source,'editor_at',editor_at,'questions',out_rows,'unavailable',unavailable);
END $$;
REVOKE ALL ON FUNCTION public.bilan_vtc_fg_training_read(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_vtc_fg_training_read(text,uuid) TO authenticated;