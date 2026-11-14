-- PREPARATION ONLY. Never applied to production by this task.
-- Targeted to module_5_exo_505 original attempt. Reuses persist_answer_batch_v2 + submit_quiz_attempt.
-- Rule (last click): a journal value is restorable only if the same owner/attempt's final event is identical
-- whether ordered by device time or server arrival, with no same-instant conflicting value and only snapshot
-- letters. Anything else is "ambigu": never restored, the learner must choose again (new event = new proof).

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

-- Internal: per-question provenance of the learner's own clicks. Never returns answer keys.
CREATE OR REPLACE FUNCTION public.bilan_505_journal_revue(p_apprenant_id uuid,p_user_id uuid,p_tentative int,p_copie jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH s AS (SELECT questions FROM bilan_passage_snapshots WHERE apprenant_id=p_apprenant_id AND module_id=5 AND exercice_id=505 AND tentative=p_tentative),
 opts AS (SELECT x->>'cle' cle, array_agg(c->>'lettre') lettres FROM s, jsonb_array_elements(s.questions) x, jsonb_array_elements(x->'choix') c GROUP BY 1),
 ev AS (SELECT question_id, valeur, user_id, COALESCE(client_saved_at,created_at) t_app, created_at t_srv
   FROM reponses_apprenants_journal WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505' AND tentative=p_tentative),
 lc AS (SELECT DISTINCT ON (question_id) question_id, valeur, user_id, t_app FROM ev ORDER BY question_id, t_app DESC, t_srv DESC),
 ls AS (SELECT DISTINCT ON (question_id) question_id, valeur FROM ev ORDER BY question_id, t_srv DESC, t_app DESC),
 n AS (SELECT question_id, count(*) nb, bool_or(user_id IS DISTINCT FROM p_user_id) autre FROM ev GROUP BY 1),
 q AS (SELECT lc.question_id, p_copie->lc.question_id copie, lc.valeur dernier, lc.t_app, n.nb,
   CASE WHEN n.autre OR lc.valeur IS DISTINCT FROM ls.valeur
     OR EXISTS(SELECT 1 FROM ev e WHERE e.question_id=lc.question_id AND e.t_app=lc.t_app AND e.valeur IS DISTINCT FROM lc.valeur)
     OR jsonb_typeof(lc.valeur)<>'array'
     OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(lc.valeur)='array' THEN lc.valeur ELSE '[]' END) a
               WHERE NOT a = ANY(COALESCE((SELECT lettres FROM opts WHERE cle=lc.question_id),'{}')))
   THEN 'ambigu' ELSE 'certain' END certitude
   FROM lc JOIN ls USING(question_id) JOIN n USING(question_id))
 SELECT jsonb_build_object(
  'reponses', p_copie || COALESCE((SELECT jsonb_object_agg(question_id, dernier) FROM q WHERE certitude='certain'),'{}'),
  'ambigues', COALESCE((SELECT jsonb_agg(question_id ORDER BY split_part(question_id,'-',2)::int) FROM q WHERE certitude='ambigu'),'[]'),
  'revue', COALESCE((SELECT jsonb_agg(jsonb_build_object('question_id',question_id,'copie',copie,'dernier',dernier,'certitude',certitude,
     'evenements',nb,'dernier_clic_at',t_app) ORDER BY split_part(question_id,'-',2)::int)
     FROM q WHERE certitude='ambigu' OR copie IS DISTINCT FROM dernier),'[]'))
$$;
REVOKE ALL ON FUNCTION public.bilan_505_journal_revue(uuid,uuid,int,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.bilan_505_remise_prepare(p_apprenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; rv jsonb; grade jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'owner'; END IF;
 SELECT * INTO STRICT r FROM reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505';
 IF (SELECT count(*) FROM jsonb_object_keys(r.reponses))<>49
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(r.reponses) k WHERE k!~'^505-[0-9]+$')
   OR EXISTS(SELECT 1 FROM reponses_apprenants_journal WHERE apprenant_id=p_apprenant_id AND exercice_id=r.exercice_id AND tentative=r.tentative AND NOT r.reponses ? question_id)
 THEN RAISE EXCEPTION 'identities'; END IF;
 rv:=bilan_505_journal_revue(p_apprenant_id,auth.uid(),r.tentative,r.reponses);
 BEGIN grade:=bilan_505_snapshot_grade(p_apprenant_id,r.tentative,rv->'reponses');
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM IN ('incomplete','answer_option') THEN grade:=jsonb_build_object('grading_status','reponses_incompletes'); ELSE RAISE; END IF;
 END;
 -- No answer keys, question content or provisional numeric grade before submission.
 RETURN jsonb_build_object('id',r.id,'tentative',r.tentative,'write_seq',r.write_seq,'status',r.status,
  'reponses',rv->'reponses','stored_reponses',r.reponses,'revue',rv->'revue','ambiguous_questions',rv->'ambigues',
  'grading_status',grade->'grading_status','unresolved_questions',COALESCE(grade->'unresolved_questions','[]'::jsonb));
END $$;

-- Internal: CAS + exact proof + explicit review confirmation, then reconcile copy through existing persistence.
CREATE OR REPLACE FUNCTION public.bilan_505_reconcilier(p_apprenant_id uuid,p_row_id uuid,p_tentative int,p_write_seq bigint,p_reponses jsonb,p_revue_confirmee boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; proof jsonb; ack record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'owner'; END IF;
 SELECT * INTO STRICT r FROM reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505' FOR UPDATE;
 IF r.id<>p_row_id OR r.tentative<>p_tentative THEN RAISE EXCEPTION 'attempt'; END IF;
 IF r.status='submitted' OR r.completed THEN RAISE EXCEPTION 'closed'; END IF;
 IF r.write_seq<>p_write_seq THEN RAISE EXCEPTION 'stale'; END IF;
 proof:=bilan_505_remise_prepare(p_apprenant_id);
 IF jsonb_array_length(proof->'ambiguous_questions')>0 THEN RAISE EXCEPTION 'ambiguous_journal'; END IF;
 IF proof->'reponses' IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'unresolved'; END IF;
 IF r.reponses IS DISTINCT FROM p_reponses THEN
   IF NOT COALESCE(p_revue_confirmee,false) THEN RAISE EXCEPTION 'revue_requise'; END IF;
   SELECT * INTO ack FROM persist_answer_batch_v2(p_apprenant_id,auth.uid(),5,r.exercice_id,'quiz',p_reponses,false,NULL,r.write_seq,'[]');
   IF NOT ack.saved OR ack.frozen OR cardinality(ack.skipped_questions)>0 OR ack.stored_reponses IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'reconciliation'; END IF;
 END IF;
 SELECT * INTO r FROM reponses_apprenants WHERE id=p_row_id;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bilan_505_reconcilier(uuid,uuid,int,bigint,jsonb,boolean) FROM PUBLIC,anon,authenticated;

-- Recovery without submission: allowed even when grading is blocked (Q7 without key). Status stays in_progress.
CREATE OR REPLACE FUNCTION public.bilan_505_recuperer_reponses(p_apprenant_id uuid,p_row_id uuid,p_tentative int,p_write_seq bigint,p_reponses jsonb,p_revue_confirmee boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 r:=bilan_505_reconcilier(p_apprenant_id,p_row_id,p_tentative,p_write_seq,p_reponses,p_revue_confirmee);
 IF r->>'status'<>'in_progress' OR r->'reponses' IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'readback'; END IF;
 RETURN jsonb_build_object('id',r->'id','tentative',r->'tentative','write_seq',r->'write_seq','status',r->'status','reponses',r->'reponses');
END $$;

CREATE OR REPLACE FUNCTION public.bilan_505_remise_commit(p_apprenant_id uuid,p_row_id uuid,p_tentative int,p_write_seq bigint,p_reponses jsonb,p_revue_confirmee boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; grade jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'owner'; END IF;
 SELECT * INTO STRICT r FROM reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505' FOR UPDATE;
 IF r.id<>p_row_id OR r.tentative<>p_tentative THEN RAISE EXCEPTION 'attempt'; END IF;
 IF r.status='submitted' THEN
   IF r.reponses IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'closed_difference'; END IF;
   RETURN to_jsonb(r);
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_reponses))<>49
   OR EXISTS(SELECT 1 FROM jsonb_each(p_reponses) e WHERE jsonb_typeof(e.value)<>'array' OR e.value='[]'::jsonb) THEN RAISE EXCEPTION 'unresolved'; END IF;
 grade:=bilan_505_snapshot_grade(p_apprenant_id,r.tentative,p_reponses);
 IF grade->>'grading_status'<>'verifiable' THEN RAISE EXCEPTION 'corrige_snapshot_incomplet'; END IF;
 PERFORM bilan_505_reconcilier(p_apprenant_id,p_row_id,p_tentative,p_write_seq,p_reponses,p_revue_confirmee);
 SELECT * INTO r FROM submit_quiz_attempt(p_apprenant_id,r.exercice_id,'quiz',p_reponses,(grade->>'score')::numeric,(grade->>'bonnes_reponses')::int,49);
 IF r.status<>'submitted' OR r.reponses IS DISTINCT FROM p_reponses OR r.score IS DISTINCT FROM (grade->>'score')::numeric
  OR r.bonnes_reponses IS DISTINCT FROM (grade->>'bonnes_reponses')::int OR r.total_questions<>49 THEN RAISE EXCEPTION 'readback'; END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bilan_505_remise_prepare(uuid),public.bilan_505_recuperer_reponses(uuid,uuid,int,bigint,jsonb,boolean),
  public.bilan_505_remise_commit(uuid,uuid,int,bigint,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_505_remise_prepare(uuid),public.bilan_505_recuperer_reponses(uuid,uuid,int,bigint,jsonb,boolean),
  public.bilan_505_remise_commit(uuid,uuid,int,bigint,jsonb,boolean) TO authenticated;
