CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_reprise(p_qrc uuid,p_base jsonb,p_interruption_confirmee boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.qrc_instances_v2; ancien public.qrc_ia_corrections; dernier public.qrc_ia_reprises; nouveau uuid; n integer; legacy_id uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=p_qrc FOR UPDATE;
 IF NOT FOUND OR q.etat<>'en_attente' OR q.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN NULL; END IF;
 IF p_base->>'attempt_id' IS DISTINCT FROM q.attempt_id::text OR p_base->>'apprenant_id' IS DISTINCT FROM q.apprenant_id::text OR p_base->>'question_id' IS DISTINCT FROM q.question_id THEN RAISE EXCEPTION 'Identite incoherente'; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND (NOT actif OR pause_depuis IS NOT NULL)) THEN RETURN NULL; END IF;
 SELECT * INTO dernier FROM public.qrc_ia_reprises WHERE qrc_instance_id=p_qrc ORDER BY numero DESC LIMIT 1;
 IF FOUND THEN
  IF dernier.numero>=2 OR dernier.statut<>'erreur' OR NOT (dernier.http_status=429 OR dernier.http_status>=500) OR dernier.termine_at IS NULL OR dernier.termine_at>now()-interval '30 seconds' THEN RETURN NULL; END IF;
  n:=dernier.numero+1;
 ELSE
  n:=1;
  SELECT * INTO ancien FROM public.qrc_ia_corrections WHERE qrc_instance_id=p_qrc LIMIT 1;
  IF FOUND THEN
   IF ancien.reponse_hash IS DISTINCT FROM p_base->>'reponse_hash' THEN RAISE EXCEPTION 'Version reponse incoherente'; END IF;
   IF NOT ((ancien.statut='erreur' AND (ancien.http_status=429 OR ancien.http_status>=500) AND ancien.termine_at<=now()-interval '30 seconds') OR (ancien.statut='en_cours' AND ancien.termine_at IS NULL AND p_interruption_confirmee AND ancien.created_at<=now()-interval '10 minutes')) THEN RETURN NULL; END IF;
  ELSE
   INSERT INTO public.qrc_ia_corrections(cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,exam_id,matiere,reponse_hash,modele,bareme,statut)
   VALUES(p_base->>'cle_idempotence',p_qrc,q.attempt_id,q.apprenant_id,q.question_id,p_base->>'exam_id',p_base->>'matiere',p_base->>'reponse_hash',p_base->>'modele',(p_base->>'bareme')::numeric,'en_cours')
   ON CONFLICT(cle_idempotence) DO NOTHING RETURNING id INTO legacy_id;
   IF legacy_id IS NULL THEN RETURN NULL; END IF;
  END IF;
 END IF;
 INSERT INTO public.qrc_ia_reprises(qrc_instance_id,base,numero) VALUES(p_qrc,p_base,n) RETURNING id INTO nouveau;
 RETURN nouveau;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_reserver_reprise(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_reserver_reprise(uuid,jsonb,boolean) TO service_role;