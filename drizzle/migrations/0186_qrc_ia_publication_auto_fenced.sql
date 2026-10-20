CREATE OR REPLACE FUNCTION public.qrc_ia_publier_auto(p_id uuid,p_initial boolean,p_attempt uuid,p_qrc uuid,p_reponse jsonb,p_operation uuid,p_note numeric,p_justification text,p_run_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.qrc_ia_suites; q public.qrc_instances_v2; preuve jsonb;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO j FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR j.statut<>'en_cours' OR j.lease_until<=now() THEN RAISE EXCEPTION 'Publication hors reservation active'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=p_qrc FOR UPDATE;
 IF NOT FOUND OR q.attempt_id IS DISTINCT FROM p_attempt OR q.reponse IS DISTINCT FROM p_reponse THEN RAISE EXCEPTION 'Reponse ou passage different'; END IF;
 IF p_initial THEN
  IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections WHERE id=p_id AND qrc_instance_id=p_qrc AND attempt_id=p_attempt) THEN RAISE EXCEPTION 'Reservation incoherente'; END IF;
  preuve:=public.qrc_ia_publier_initial(p_id,p_operation,p_note,p_justification);
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_reprises WHERE id=p_id AND qrc_instance_id=p_qrc AND base->>'attempt_id'=p_attempt::text) THEN RAISE EXCEPTION 'Reprise incoherente'; END IF;
  preuve:=public.qrc_ia_publier_reprise(p_id,p_operation,p_note,p_justification,p_run_id);
 END IF;
 IF COALESCE((preuve->>'ignoree')::boolean,false) THEN RETURN preuve; END IF;
 IF preuve->>'qrc_instance_id' IS DISTINCT FROM p_qrc::text OR preuve->>'etat' IS DISTINCT FROM 'corrigee' OR (preuve->>'note')::numeric IS DISTINCT FROM p_note THEN RAISE EXCEPTION 'Preuve finale incoherente'; END IF;
 RETURN preuve;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_publier_auto(uuid,boolean,uuid,uuid,jsonb,uuid,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_publier_auto(uuid,boolean,uuid,uuid,jsonb,uuid,numeric,text,text) TO service_role;