-- PREPARATION ONLY. Never applied to production by this task.
-- Reuse existing persistence + submit; exact row/attempt/sequence and journal under row lock.
CREATE OR REPLACE FUNCTION public.bilan_505_remise_prepare(p_apprenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; answers jsonb; e record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM apprenants WHERE id=p_apprenant_id AND auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'owner'; END IF;
 SELECT * INTO STRICT r FROM reponses_apprenants WHERE apprenant_id=p_apprenant_id AND exercice_id='module_5_exo_505';
 answers:=r.reponses;
 IF (SELECT count(*) FROM jsonb_object_keys(answers))<>49 THEN RAISE EXCEPTION 'identities'; END IF;
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
 RETURN jsonb_build_object('id',r.id,'tentative',r.tentative,'write_seq',r.write_seq,'status',r.status,'reponses',answers,'stored_reponses',r.reponses);
END $$;
CREATE OR REPLACE FUNCTION public.bilan_505_remise_commit(p_apprenant_id uuid,p_row_id uuid,p_tentative int,p_write_seq bigint,p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; proof jsonb; ack record;
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
 IF proof->'reponses' IS DISTINCT FROM p_reponses OR (SELECT count(*) FROM jsonb_object_keys(p_reponses))<>49
   OR EXISTS(SELECT 1 FROM jsonb_each(p_reponses) e WHERE jsonb_typeof(e.value)<>'array' OR e.value='[]'::jsonb)
 THEN RAISE EXCEPTION 'unresolved'; END IF;
 IF r.reponses IS DISTINCT FROM p_reponses THEN
   SELECT * INTO ack FROM persist_answer_batch_v2(p_apprenant_id,auth.uid(),5,r.exercice_id,'quiz',p_reponses,false,NULL,r.write_seq,'[]');
   IF NOT ack.saved OR ack.frozen OR cardinality(ack.skipped_questions)>0 THEN RAISE EXCEPTION 'reconciliation'; END IF;
 END IF;
 -- No guessed score: keep proven scoring fields until the frozen question source is established.
 SELECT * INTO r FROM submit_quiz_attempt(p_apprenant_id,r.exercice_id,'quiz',p_reponses,r.score,r.bonnes_reponses,r.total_questions);
 IF r.status<>'submitted' OR r.reponses IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'readback'; END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bilan_505_remise_prepare(uuid),public.bilan_505_remise_commit(uuid,uuid,int,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_505_remise_prepare(uuid),public.bilan_505_remise_commit(uuid,uuid,int,bigint,jsonb) TO authenticated;