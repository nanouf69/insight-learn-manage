CREATE OR REPLACE FUNCTION public.qrc_ia_publier_initial(p_id uuid,p_operation uuid,p_note numeric,p_justification text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.qrc_ia_corrections; q public.qrc_instances_v2; preuve jsonb;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.qrc_ia_corrections WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.statut<>'en_cours' THEN RAISE EXCEPTION 'Reservation inactive'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=r.qrc_instance_id FOR UPDATE;
 IF q.etat<>'en_attente' THEN
  UPDATE public.qrc_ia_corrections SET statut='ignoree',termine_at=now(),motif='Correction deja definitive' WHERE id=p_id;
  RETURN jsonb_build_object('ignoree',true);
 END IF;
 IF p_note<0 OR p_note>r.bareme OR mod(p_note*2,1)<>0 OR nullif(trim(p_justification),'') IS NULL THEN RAISE EXCEPTION 'Resultat invalide'; END IF;
 preuve:=public.core_correct_qrc_publish(p_operation,r.qrc_instance_id,p_note,'🤖 '||p_justification,'ia:'||r.modele);
 UPDATE public.qrc_ia_corrections SET statut='appliquee',note=p_note,justification=p_justification,http_status=200,termine_at=now() WHERE id=p_id;
 RETURN preuve;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_publier_initial(uuid,uuid,numeric,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.qrc_ia_publier_initial(uuid,uuid,numeric,text) TO service_role;
-- Validate response identity on every retry, not only the first receipt.
CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_auto(p_qrc uuid,p_base jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.qrc_instances_v2; ancien public.qrc_ia_corrections; legacy_id uuid; reprise_id uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=p_qrc FOR UPDATE;
 IF NOT FOUND OR q.etat<>'en_attente' OR q.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN NULL; END IF;
 IF p_base->>'attempt_id' IS DISTINCT FROM q.attempt_id::text OR p_base->>'apprenant_id' IS DISTINCT FROM q.apprenant_id::text OR p_base->>'question_id' IS DISTINCT FROM q.question_id THEN RAISE EXCEPTION 'Identite incoherente'; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND pause_depuis IS NOT NULL) THEN RETURN NULL; END IF;
 SELECT * INTO ancien FROM public.qrc_ia_corrections WHERE qrc_instance_id=p_qrc LIMIT 1;
 IF NOT FOUND THEN
  INSERT INTO public.qrc_ia_corrections(cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,exam_id,matiere,reponse_hash,modele,bareme,statut)
  VALUES(p_base->>'cle_idempotence',p_qrc,q.attempt_id,q.apprenant_id,q.question_id,p_base->>'exam_id',p_base->>'matiere',p_base->>'reponse_hash',p_base->>'modele',(p_base->>'bareme')::numeric,'en_cours')
  ON CONFLICT(cle_idempotence) DO NOTHING RETURNING id INTO legacy_id;
  IF legacy_id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('type','initial','id',legacy_id);
 END IF;
 IF ancien.reponse_hash IS DISTINCT FROM p_base->>'reponse_hash' OR ancien.cle_idempotence IS DISTINCT FROM p_base->>'cle_idempotence' THEN RAISE EXCEPTION 'Version reponse incoherente'; END IF;
 reprise_id:=public.qrc_ia_reserver_reprise(p_qrc,p_base,false);
 IF reprise_id IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('type','reprise','id',reprise_id);
END $$;