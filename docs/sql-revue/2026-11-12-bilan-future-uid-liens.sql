-- CANDIDATE ONLY, not installed. New A–E Bilan (bilan_future_*) explicit version→UID links.
-- No backfill: the table starts empty. A link exists only after an admin confirmation
-- that the server re-proves (same module+exercise, exact statement + letter/text pairs,
-- unique on both sides). Append-only. Without a confirmed link, a question is never mapped.
CREATE TABLE public.bilan_future_uid_liens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL, module_id int NOT NULL CHECK (module_id IN (5,11)), exercise_id int NOT NULL,
 question_id int NOT NULL, uid text NOT NULL, preuve jsonb NOT NULL,
 confirme_par uuid NOT NULL, confirme_le timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE UNIQUE INDEX bilan_future_uid_liens_q ON public.bilan_future_uid_liens(version_id,exercise_id,question_id);
CREATE UNIQUE INDEX bilan_future_uid_liens_u ON public.bilan_future_uid_liens(version_id,exercise_id,uid);
ALTER TABLE public.bilan_future_uid_liens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bilan_future_uid_liens FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.bilan_future_uid_liens_immuable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'APPEND_ONLY' USING ERRCODE='42501'; END $$;
CREATE TRIGGER trg_bilan_future_uid_liens_immuable BEFORE UPDATE OR DELETE ON public.bilan_future_uid_liens
 FOR EACH ROW EXECUTE FUNCTION public.bilan_future_uid_liens_immuable();

CREATE FUNCTION public._bilan_future_sig(q jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_array(q->>'enonce',(SELECT jsonb_agg(jsonb_build_array(c->>'lettre',c->>'texte') ORDER BY c->>'lettre') FROM jsonb_array_elements(q->'choix') c)) $$;

-- Read-only candidates (admin): proposals to confirm, never identities.
CREATE FUNCTION public.bilan_future_uid_candidats(p_version uuid,p_module int,p_exercise int) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE vq jsonb; ed jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bilan_future_receipts WHERE version_id=p_version AND module_id=p_module AND exercise_id=p_exercise) THEN RAISE EXCEPTION 'VERSION_NOT_USED'; END IF;
 SELECT questions INTO vq FROM bilan_future_versions WHERE id=p_version;
 SELECT jsonb_agg(q) INTO ed FROM module_editor_state m,jsonb_array_elements(m.module_data->'exercices') e,jsonb_array_elements(e->'questions') q
  WHERE m.module_id=p_module AND e->>'id'=p_exercise::text;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('question_id',(h->>'id')::int,
   'statut',CASE WHEN nv<>1 THEN 'ambigu_version' WHEN ne=0 THEN 'absent_editeur' WHEN ne>1 THEN 'ambigu_editeur' ELSE 'candidat' END,
   'uid',CASE WHEN nv=1 AND ne=1 THEN uid END)),'[]') FROM (
  SELECT h,(SELECT count(*) FROM jsonb_array_elements(vq) x WHERE _bilan_future_sig(x)=_bilan_future_sig(h)) nv,
   (SELECT count(*) FROM jsonb_array_elements(coalesce(ed,'[]')) y WHERE _bilan_future_sig(y)=_bilan_future_sig(h) AND y ? 'uid') ne,
   (SELECT min(y->>'uid') FROM jsonb_array_elements(coalesce(ed,'[]')) y WHERE _bilan_future_sig(y)=_bilan_future_sig(h)) uid
  FROM jsonb_array_elements(vq) h) z);
END $$;

-- Admin confirmation, re-proved on the server at the moment of confirmation. Idempotent.
CREATE FUNCTION public.bilan_future_uid_confirmer(p_version uuid,p_module int,p_exercise int,p_question int,p_uid text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; prior public.bilan_future_uid_liens;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM bilan_future_uid_liens WHERE version_id=p_version AND exercise_id=p_exercise AND question_id=p_question;
 IF prior.id IS NOT NULL THEN
  IF prior.uid=p_uid THEN RETURN jsonb_build_object('lien',prior.id,'deja',true); END IF;
  RAISE EXCEPTION 'LINK_CONFLICT' USING ERRCODE='23505'; END IF;
 SELECT x INTO c FROM jsonb_array_elements(public.bilan_future_uid_candidats(p_version,p_module,p_exercise)) x WHERE (x->>'question_id')::int=p_question;
 IF c->>'statut' IS DISTINCT FROM 'candidat' OR c->>'uid' IS DISTINCT FROM p_uid THEN RAISE EXCEPTION 'PROOF_FAILED' USING ERRCODE='22023'; END IF;
 INSERT INTO bilan_future_uid_liens(version_id,module_id,exercise_id,question_id,uid,preuve,confirme_par)
  VALUES(p_version,p_module,p_exercise,p_question,p_uid,jsonb_build_object('regle','enonce+lettre/texte exacts, uniques des deux cotes'),auth.uid())
  RETURNING jsonb_build_object('lien',id,'deja',false) INTO c;
 RETURN c;
END $$;

-- Read-only current-key projection of a SUBMITTED A–E receipt; same shape as bilan_corrige_actuel_read.
CREATE FUNCTION public.bilan_future_corrige_actuel_read(p_receipt uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bilan_future_receipts; s public.bilan_future_submissions; vq jsonb; ed jsonb; editor_at timestamptz; rows jsonb:='[]'; h jsonb; u text; n int; cur jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM bilan_future_receipts WHERE id=p_receipt AND (owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
 IF r.id IS NULL THEN RAISE EXCEPTION 'OWN_SUBMITTED_COPY_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM bilan_future_submissions WHERE receipt_id=r.id;
 IF s.receipt_id IS NULL THEN RAISE EXCEPTION 'SUBMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT questions INTO vq FROM bilan_future_versions WHERE id=r.version_id;
 SELECT m.updated_at,(SELECT jsonb_agg(q) FROM jsonb_array_elements(m.module_data->'exercices') e,jsonb_array_elements(e->'questions') q WHERE e->>'id'=r.exercise_id::text)
  INTO editor_at,ed FROM module_editor_state m WHERE m.module_id=r.module_id;
 IF editor_at IS NULL THEN RAISE EXCEPTION 'EDITOR_UNVERIFIED'; END IF;
 FOR h IN SELECT q FROM jsonb_array_elements(vq) q LOOP
  SELECT l.uid INTO u FROM bilan_future_uid_liens l WHERE l.version_id=r.version_id AND l.exercise_id=r.exercise_id AND l.question_id=(h->>'id')::int;
  SELECT count(*),(array_agg(q))[1] INTO n,cur FROM jsonb_array_elements(coalesce(ed,'[]')) q WHERE u IS NOT NULL AND q->>'uid'=u;
  rows:=rows||jsonb_build_array(jsonb_build_object('uid',u,'cle',h->>'id','frozen',h||jsonb_build_object('uid',u),
   'current',CASE WHEN n=1 THEN cur END,'matches',coalesce(n,0),'submitted',coalesce(s.answers->(h->>'id'),'null'),'practice',NULL));
  u:=NULL;
 END LOOP;
 RETURN jsonb_build_object('snapshot_id',r.id,'module_id',r.module_id,'exercice_id',r.exercise_id,'editor_at',editor_at,
  'original_score',s.correct_count,'question_count',s.question_count,'questions',rows);
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_uid_candidats(uuid,int,int),public.bilan_future_uid_confirmer(uuid,int,int,int,text),
 public.bilan_future_corrige_actuel_read(uuid),public._bilan_future_sig(jsonb),public.bilan_future_uid_liens_immuable() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_future_uid_candidats(uuid,int,int),public.bilan_future_uid_confirmer(uuid,int,int,int,text),
 public.bilan_future_corrige_actuel_read(uuid) TO authenticated;
-- Rollback (keeps no learner data): DROP FUNCTION the four functions, then DROP TABLE public.bilan_future_uid_liens only if empty.
