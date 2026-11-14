-- PREPARATION ONLY. Never applied to production by this task.
-- Reuse existing persistence + submit; exact row/attempt/sequence and journal under row lock.
CREATE OR REPLACE FUNCTION public.bilan_505_snapshot_grade(p_apprenant_id uuid,p_tentative int,p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.bilan_passage_snapshots; q jsonb; letters jsonb; selected jsonb; correct_count int:=0; missing text[]:='{}';
BEGIN
 SELECT * INTO STRICT s FROM bilan_passage_snapshots WHERE apprenant_id=p_apprenant_id AND module_id=5 AND exercice_id=505 AND tentative=p_tentative;
 IF s.nb_questions<>49 OR jsonb_array_length(s.questions)<>49 OR md5(s.questions::text) IS DISTINCT FROM s.empreinte
  OR (SELECT count(DISTINCT x->>'uid') FROM jsonb_array_elements(s.questions) x)<>49
  OR (SELECT count(DISTINCT x->>'cle') FROM jsonb_array_elements(s.questions) x)<>49 THEN RAISE EXCEPTION 'snapshot_integrity'; END IF;
 FOR q IN SELECT x FROM jsonb_array_elements(s.questions) x LOOP
  IF q->>'type'<>'QCM' OR q->>'cle' IS DISTINCT FROM '505-'||(q->>'question_id')
    OR q->>'uid' IS DISTINCT FROM q->'question_source'->>'uid'
    OR q->>'question_id' IS DISTINCT FROM q->'question_source'->>'id'
    OR q->'choix' IS DISTINCT FROM q->'question_source'->'choix' THEN RAISE EXCEPTION 'snapshot_identity'; END IF;
  IF (SELECT count(DISTINCT c->>'lettre') FROM jsonb_array_elements(q->'choix') c)<>jsonb_array_length(q->'choix') THEN RAISE EXCEPTION 'snapshot_options'; END IF;
  SELECT jsonb_agg(v ORDER BY v) INTO letters FROM (SELECT DISTINCT c->>'lettre' v FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true') x;
  IF letters IS NULL THEN missing:=array_append(missing,q->>'cle'); CONTINUE; END IF;
  IF NOT p_reponses ? (q->>'cle') OR jsonb_typeof(p_reponses->(q->>'cle'))<>'array' OR p_reponses->(q->>'cle')='[]'::jsonb THEN RAISE EXCEPTION 'incomplete'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_reponses->(q->>'cle')) a WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'lettre'=a)) THEN RAISE EXCEPTION 'answer_option'; END IF;
  SELECT jsonb_agg(v ORDER BY v) INTO selected FROM (SELECT DISTINCT a v FROM jsonb_array_elements_text(p_reponses->(q->>'cle')) a) x;
  IF selected=letters THEN correct_count:=correct_count+1; END IF;
 END LOOP;
 IF cardinality(missing)>0 THEN RETURN jsonb_build_object('grading_status','corrige_snapshot_incomplet','unresolved_questions',to_jsonb(missing)); END IF;
 RETURN jsonb_build_object('grading_status','verifiable','score',round(correct_count::numeric*100/49),'bonnes_reponses',correct_count,'total_questions',49,'snapshot_id',s.id,'snapshot_fingerprint',s.empreinte);
END $$;
REVOKE ALL ON FUNCTION public.bilan_505_snapshot_grade(uuid,int,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.bilan_505_remise_prepare(p_apprenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; answers jsonb; e record; grade jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'owner'; END IF;
 SELECT * INTO STRICT r FROM reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505';
 answers:=r.reponses;
 IF (SELECT count(*) FROM jsonb_object_keys(answers))<>49
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(answers) k WHERE k!~'^505-[0-9]+$')
   OR (SELECT count(DISTINCT question_id) FROM reponses_apprenants_journal WHERE apprenant_id=p_apprenant_id AND exercice_id=r.exercice_id AND tentative=r.tentative)<>49
 THEN RAISE EXCEPTION 'identities'; END IF;
 FOR e IN SELECT DISTINCT ON(question_id) question_id,valeur,user_id FROM reponses_apprenants_journal
   WHERE apprenant_id=p_apprenant_id AND exercice_id=r.exercice_id AND tentative=r.tentative
   ORDER BY question_id,COALESCE(client_saved_at,created_at) DESC,created_at DESC,id DESC
 LOOP
   IF e.user_id IS DISTINCT FROM auth.uid() OR NOT answers ? e.question_id THEN RAISE EXCEPTION 'journal_identity'; END IF;
   answers:=jsonb_set(answers,ARRAY[e.question_id],e.valeur);
 END LOOP;
 -- Tied timestamps with differing choices are ambiguous, never resolved by random UUID.
 IF EXISTS(SELECT 1 FROM reponses_apprenants_journal a JOIN reponses_apprenants_journal b
   ON a.apprenant_id=b.apprenant_id AND a.exercice_id=b.exercice_id AND a.tentative=b.tentative
   AND a.question_id=b.question_id AND COALESCE(a.client_saved_at,a.created_at)=COALESCE(b.client_saved_at,b.created_at)
   AND a.created_at=b.created_at AND a.valeur IS DISTINCT FROM b.valeur
   WHERE a.apprenant_id=p_apprenant_id AND a.exercice_id=r.exercice_id AND a.tentative=r.tentative)
 THEN RAISE EXCEPTION 'ambiguous_journal'; END IF;
 grade:=bilan_505_snapshot_grade(p_apprenant_id,r.tentative,answers);
 -- No answer keys, question content or provisional numeric grade in pre-submission response.
 RETURN jsonb_build_object('id',r.id,'tentative',r.tentative,'write_seq',r.write_seq,'status',r.status,'reponses',answers,'stored_reponses',r.reponses,
  'grading_status',grade->'grading_status','unresolved_questions',COALESCE(grade->'unresolved_questions','[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.bilan_505_remise_commit(p_apprenant_id uuid,p_row_id uuid,p_tentative int,p_write_seq bigint,p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; proof jsonb; ack record; grade jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'owner'; END IF;
 SELECT * INTO STRICT r FROM reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505' FOR UPDATE;
 IF r.id<>p_row_id OR r.tentative<>p_tentative THEN RAISE EXCEPTION 'attempt'; END IF;
 IF r.status='submitted' THEN
   IF r.reponses IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'closed_difference'; END IF;
   RETURN to_jsonb(r);
 END IF;
 IF r.write_seq<>p_write_seq OR r.completed THEN RAISE EXCEPTION 'stale'; END IF;
 proof:=bilan_505_remise_prepare(p_apprenant_id);
 IF proof->>'grading_status'<>'verifiable' THEN RAISE EXCEPTION 'corrige_snapshot_incomplet'; END IF;
 IF proof->'reponses' IS DISTINCT FROM p_reponses OR (SELECT count(*) FROM jsonb_object_keys(p_reponses))<>49
   OR EXISTS(SELECT 1 FROM jsonb_each(p_reponses) e WHERE jsonb_typeof(e.value)<>'array' OR e.value='[]'::jsonb)
 THEN RAISE EXCEPTION 'unresolved'; END IF;
 IF r.reponses IS DISTINCT FROM p_reponses THEN
   SELECT * INTO ack FROM persist_answer_batch_v2(p_apprenant_id,auth.uid(),5,r.exercice_id,'quiz',p_reponses,false,NULL,r.write_seq,'[]');
   IF NOT ack.saved OR ack.frozen OR cardinality(ack.skipped_questions)>0 THEN RAISE EXCEPTION 'reconciliation'; END IF;
 END IF;
 grade:=bilan_505_snapshot_grade(p_apprenant_id,r.tentative,p_reponses);
 IF grade->>'grading_status'<>'verifiable' THEN RAISE EXCEPTION 'corrige_snapshot_incomplet'; END IF;
 SELECT * INTO r FROM submit_quiz_attempt(p_apprenant_id,r.exercice_id,'quiz',p_reponses,(grade->>'score')::numeric,(grade->>'bonnes_reponses')::int,49);
 IF r.status<>'submitted' OR r.reponses IS DISTINCT FROM p_reponses OR r.score IS DISTINCT FROM (grade->>'score')::numeric
  OR r.bonnes_reponses IS DISTINCT FROM (grade->>'bonnes_reponses')::int OR r.total_questions<>49 THEN RAISE EXCEPTION 'readback'; END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bilan_505_remise_prepare(uuid),public.bilan_505_remise_commit(uuid,uuid,int,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_505_remise_prepare(uuid),public.bilan_505_remise_commit(uuid,uuid,int,bigint,jsonb) TO authenticated;