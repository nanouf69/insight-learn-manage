CREATE TABLE public.qrc_ia_reprises (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), qrc_instance_id uuid NOT NULL REFERENCES public.qrc_instances_v2(qrc_instance_id),
 base jsonb NOT NULL, numero integer NOT NULL DEFAULT 1, statut text NOT NULL DEFAULT 'en_cours',
 created_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz NOT NULL DEFAULT (now()+interval '10 minutes'),
 termine_at timestamptz, http_status integer, message text, resultat jsonb, run_id text,
 UNIQUE(qrc_instance_id,numero)
);
GRANT SELECT ON public.qrc_ia_reprises TO authenticated;
GRANT ALL ON public.qrc_ia_reprises TO service_role;
ALTER TABLE public.qrc_ia_reprises ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_ia_reprises_admin_read ON public.qrc_ia_reprises FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.qrc_ia_reprise_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Suppression trace IA interdite'; END IF;
 IF OLD.statut<>'en_cours' OR NEW.id<>OLD.id OR NEW.qrc_instance_id<>OLD.qrc_instance_id OR NEW.base IS DISTINCT FROM OLD.base OR NEW.numero<>OLD.numero OR NEW.created_at<>OLD.created_at OR NEW.lease_until<>OLD.lease_until THEN RAISE EXCEPTION 'Trace IA immuable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER qrc_ia_reprise_immuable BEFORE UPDATE OR DELETE ON public.qrc_ia_reprises FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_reprise_immuable();
CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_reprise(p_qrc uuid,p_base jsonb,p_interruption_confirmee boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.qrc_instances_v2; ancien public.qrc_ia_corrections; dernier public.qrc_ia_reprises; nouveau uuid; n integer;
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
  END IF;
 END IF;
 INSERT INTO public.qrc_ia_reprises(qrc_instance_id,base,numero) VALUES(p_qrc,p_base,n) RETURNING id INTO nouveau;
 RETURN nouveau;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_reserver_reprise(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_reserver_reprise(uuid,jsonb,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.qrc_ia_publier_reprise(p_id uuid,p_operation uuid,p_note numeric,p_justification text,p_run_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.qrc_ia_reprises; q public.qrc_instances_v2; preuve jsonb;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.qrc_ia_reprises WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reprise introuvable'; END IF;
 IF r.statut='appliquee' THEN RETURN r.resultat; END IF;
 IF r.statut<>'en_cours' OR r.lease_until<=now() THEN RAISE EXCEPTION 'Reservation inactive'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=r.qrc_instance_id FOR UPDATE;
 IF q.etat<>'en_attente' THEN
  UPDATE public.qrc_ia_reprises SET statut='ignoree',termine_at=now(),message='Correction deja definitive' WHERE id=p_id;
  RETURN jsonb_build_object('ignoree',true);
 END IF;
 IF p_note<0 OR p_note>(r.base->>'bareme')::numeric OR mod(p_note*2,1)<>0 OR nullif(trim(p_justification),'') IS NULL THEN RAISE EXCEPTION 'Resultat invalide'; END IF;
 preuve:=public.core_correct_qrc_publish(p_operation,r.qrc_instance_id,p_note,'🤖 '||p_justification,'ia:'||(r.base->>'modele'));
 UPDATE public.qrc_ia_reprises SET statut='appliquee',termine_at=now(),http_status=200,resultat=preuve,message=p_justification,run_id=p_run_id WHERE id=p_id;
 RETURN preuve;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_publier_reprise(uuid,uuid,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_publier_reprise(uuid,uuid,numeric,text,text) TO service_role;