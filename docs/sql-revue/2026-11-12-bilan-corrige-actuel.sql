-- CANDIDATE ONLY, not installed. Generic read-only "current key" projection for a
-- SUBMITTED legacy Bilan examen snapshot (modules 5 VTC / 11 TAXI, any exercise incl. F/G).
-- Owner of the copy or admin only. Never writes: answers, snapshots, notes stay unchanged.
-- Identity = snapshot question uid (stable). No numeric/position fallback, no guessing.
-- Future A–E receipts are NOT covered: their versions carry no uid (see doc).
CREATE FUNCTION public.bilan_corrige_actuel_read(p_snapshot uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE snap public.bilan_passage_snapshots; sub public.reponses_apprenants; latest jsonb;
        editor jsonb; editor_at timestamptz; rows jsonb:='[]'; h jsonb; cur jsonb; n int;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO snap FROM public.bilan_passage_snapshots WHERE id=p_snapshot AND module_id IN (5,11);
 IF snap.id IS NULL OR NOT (public.has_role(auth.uid(),'admin')
    OR EXISTS(SELECT 1 FROM public.apprenants a WHERE a.id=snap.apprenant_id AND a.auth_user_id=auth.uid()))
 THEN RAISE EXCEPTION 'OWN_SUBMITTED_COPY_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT r.* INTO sub FROM public.reponses_apprenants r WHERE r.apprenant_id=snap.apprenant_id
  AND r.exercice_id=snap.passage_cle AND r.tentative=snap.tentative AND (r.status='submitted' OR r.completed IS TRUE)
  ORDER BY r.updated_at DESC LIMIT 1;
 IF sub.apprenant_id IS NULL THEN RAISE EXCEPTION 'SUBMISSION_REQUIRED' USING ERRCODE='42501'; END IF;
 -- Last practice choices: same learner, same exercise revision key, same tentative, after submission.
 SELECT r.reponses INTO latest FROM public.reponses_apprenants r WHERE r.apprenant_id=snap.apprenant_id
  AND r.exercice_id=format('module_%s_revision_exo_%s',snap.module_id,snap.exercice_id) AND r.tentative=snap.tentative
  AND r.updated_at>=coalesce(sub.submitted_at,sub.updated_at) ORDER BY r.updated_at DESC LIMIT 1;
 SELECT m.updated_at,(SELECT jsonb_agg(q) FROM jsonb_array_elements(m.module_data->'exercices') e,
   jsonb_array_elements(e->'questions') q WHERE e->>'id'=snap.exercice_id::text)
  INTO editor_at,editor FROM public.module_editor_state m WHERE m.module_id=snap.module_id;
 IF editor_at IS NULL THEN RAISE EXCEPTION 'EDITOR_UNVERIFIED'; END IF;
 FOR h IN SELECT q FROM jsonb_array_elements(snap.questions) q LOOP
  SELECT count(*),(array_agg(q))[1] INTO n,cur FROM jsonb_array_elements(coalesce(editor,'[]')) q
   WHERE h->>'uid' IS NOT NULL AND q->>'uid'=h->>'uid';
  rows:=rows||jsonb_build_array(jsonb_build_object(
   'uid',h->'uid','cle',h->'cle','frozen',h,
   'current',CASE WHEN n=1 THEN cur END,'matches',n,
   'submitted',coalesce(sub.reponses->(h->>'cle'),'null'),
   'practice',CASE WHEN latest ? (h->>'cle') THEN latest->(h->>'cle') END));
 END LOOP;
 RETURN jsonb_build_object('snapshot_id',snap.id,'module_id',snap.module_id,'exercice_id',snap.exercice_id,
  'tentative',snap.tentative,'editor_at',editor_at,'original_score',sub.score,'questions',rows);
END $$;
REVOKE ALL ON FUNCTION public.bilan_corrige_actuel_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_corrige_actuel_read(uuid) TO authenticated;
-- Rollback: DROP FUNCTION public.bilan_corrige_actuel_read(uuid);
