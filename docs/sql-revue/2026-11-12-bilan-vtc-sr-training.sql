-- CANDIDATE ONLY, not installed. Read-only, owner + submitted VTC 5/502.
-- Historical scores, answers and snapshots are never updated by this function.
CREATE FUNCTION public.bilan_vtc_sr_training_read(p_type text,p_source uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE qs jsonb; answers jsonb; latest jsonb; ex jsonb; editor_at timestamptz;
        snap public.bilan_passage_snapshots; receipt public.bilan_future_receipts;
        v_submitted_at timestamptz; out_rows jsonb:='[]'; unavailable integer:=0;
        h jsonb; a jsonb; candidates jsonb; identity text; answer_key text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_type='future' THEN
  SELECT * INTO receipt FROM public.bilan_future_receipts WHERE id=p_source AND owner_id=auth.uid() AND module_id=5 AND exercise_id=502;
  IF receipt.id IS NULL THEN RAISE EXCEPTION 'OWN_SUBMITTED_COPY_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT s.answers,s.submitted_at INTO answers,v_submitted_at FROM public.bilan_future_submissions s WHERE s.receipt_id=receipt.id;
  SELECT v.questions INTO qs FROM public.bilan_future_versions v WHERE v.id=receipt.version_id;
 ELSIF p_type='snapshot' THEN
  SELECT s.* INTO snap FROM public.bilan_passage_snapshots s JOIN public.apprenants a ON a.id=s.apprenant_id
   WHERE s.id=p_source AND a.auth_user_id=auth.uid() AND s.module_id=5 AND s.exercice_id=502;
  IF snap.id IS NULL THEN RAISE EXCEPTION 'OWN_SUBMITTED_COPY_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT r.reponses,coalesce(r.submitted_at,r.updated_at) INTO answers,v_submitted_at FROM public.reponses_apprenants r
   WHERE r.apprenant_id=snap.apprenant_id AND r.exercice_id=snap.passage_cle AND r.tentative=snap.tentative AND (r.status='submitted' OR r.completed IS TRUE);
  qs:=snap.questions;
  -- A later revision of this same tentative is the last recorded practice choice.
  SELECT r.reponses INTO latest FROM public.reponses_apprenants r WHERE r.apprenant_id=snap.apprenant_id
   AND r.exercice_id='module_5_revision_exo_502' AND r.tentative=snap.tentative
   AND r.created_at>=v_submitted_at AND r.updated_at>=v_submitted_at;
 ELSE RAISE EXCEPTION 'INVALID_SOURCE' USING ERRCODE='22023'; END IF;
 IF v_submitted_at IS NULL OR answers IS NULL THEN RAISE EXCEPTION 'SUBMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT m.updated_at,(SELECT jsonb_agg(e) FROM jsonb_array_elements(m.module_data->'exercices') e WHERE e->>'id'='502')
  INTO editor_at,candidates FROM public.module_editor_state m WHERE m.module_id=5;
 IF editor_at IS NULL OR jsonb_array_length(candidates) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'EDITOR_UNVERIFIED'; END IF;
 ex:=candidates->0;
 FOR h IN SELECT q FROM jsonb_array_elements(qs) q LOOP
  identity:=NULL;
  IF p_type='snapshot' THEN identity:=h->>'uid'; answer_key:=h->>'cle';
  ELSE
   answer_key:=h->>'id';
   -- Explicit audited continuity for the original VTC release only (SELECT 12/11).
   -- Never use numeric aliases from the TAXI 255 release, or guess other mappings.
   IF receipt.version_id='b3ab1768-df8c-41ad-ab85-89af51927141'::uuid THEN
    identity:=CASE h->>'id' WHEN '71' THEN '79ef7a10-1eac-498f-b5b5-ddb8d90d4328'
      WHEN '226' THEN '45e4fbf1-caf4-48ff-8e55-b16e2595a0e5' END;
   END IF;
  END IF;
  SELECT jsonb_agg(q) INTO candidates FROM jsonb_array_elements(ex->'questions') q WHERE q->>'uid'=identity;
  a:=candidates->0;
  IF identity IS NULL OR jsonb_array_length(candidates) IS DISTINCT FROM 1
   OR (SELECT count(*) FROM jsonb_array_elements(qs) q WHERE CASE WHEN p_type='snapshot' THEN q->>'uid'=identity ELSE q->>'id'=h->>'id' END)<>1
   OR h->>'type' IS DISTINCT FROM 'QCM' OR a->>'type' IS DISTINCT FROM 'QCM'
   OR h->>'enonce' IS DISTINCT FROM a->>'enonce'
   OR (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY n) FROM jsonb_array_elements(h->'choix') WITH ORDINALITY x(c,n))
     IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY n) FROM jsonb_array_elements(a->'choix') WITH ORDINALITY x(c,n))
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a->'choix') c WHERE c->>'correct'='true') THEN
    unavailable:=unavailable+1; CONTINUE;
  END IF;
  out_rows:=out_rows||jsonb_build_array(jsonb_build_object('uid',identity,'id',CASE WHEN p_type='snapshot' THEN h->'question_id' ELSE h->'id' END,
   'enonce',h->'enonce','choix',(SELECT jsonb_agg(jsonb_build_object('lettre',c->>'lettre','texte',c->>'texte') ORDER BY n) FROM jsonb_array_elements(h->'choix') WITH ORDINALITY x(c,n)),
   'correct',(SELECT jsonb_agg(c->>'lettre' ORDER BY n) FROM jsonb_array_elements(a->'choix') WITH ORDINALITY x(c,n) WHERE c->>'correct'='true'),
   'answer',CASE WHEN latest ? answer_key THEN latest->answer_key ELSE coalesce(answers->answer_key,'[]') END));
 END LOOP;
 RETURN jsonb_build_object('source_type',p_type,'source_id',p_source,'editor_at',editor_at,'questions',out_rows,'unavailable',unavailable);
END $$;
REVOKE ALL ON FUNCTION public.bilan_vtc_sr_training_read(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_vtc_sr_training_read(text,uuid) TO authenticated;