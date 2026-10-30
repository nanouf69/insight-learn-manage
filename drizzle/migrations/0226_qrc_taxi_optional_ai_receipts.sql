CREATE TABLE public.qrc_taxi_ia_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 identity_hash text NOT NULL,
 quiz text NOT NULL CHECK (quiz IN ('complet','specialites')),
 version text NOT NULL,
 question_id integer NOT NULL,
 answer_hash text NOT NULL,
 attempt integer NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 3),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','review','error','unknown')),
 result jsonb,
 http_status integer,
 error_message text,
 run_id text,
 retry_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 UNIQUE (user_id,identity_hash,attempt)
);
GRANT ALL ON public.qrc_taxi_ia_receipts TO service_role;
REVOKE ALL ON public.qrc_taxi_ia_receipts FROM anon, authenticated;
ALTER TABLE public.qrc_taxi_ia_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_taxi_ia_service ON public.qrc_taxi_ia_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX qrc_taxi_ia_account_time ON public.qrc_taxi_ia_receipts(user_id,created_at DESC);
CREATE TABLE public.qrc_taxi_ia_gate (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 paused boolean NOT NULL DEFAULT false,
 http_status integer,
 message text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.qrc_taxi_ia_gate TO service_role;
REVOKE ALL ON public.qrc_taxi_ia_gate FROM anon,authenticated;
ALTER TABLE public.qrc_taxi_ia_gate ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_taxi_ia_gate_service ON public.qrc_taxi_ia_gate FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE FUNCTION public.qrc_taxi_ia_claim(p_user uuid,p_identity text,p_quiz text,p_version text,p_question integer,p_answer_hash text,p_retry boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.qrc_taxi_ia_receipts; g public.qrc_taxi_ia_gate; n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('qrc-taxi-ia:'||p_user::text,0));
 SELECT * INTO r FROM public.qrc_taxi_ia_receipts WHERE user_id=p_user AND identity_hash=p_identity ORDER BY attempt DESC LIMIT 1;
 IF FOUND THEN
  IF r.status='active' AND r.created_at < now()-interval '5 minutes' THEN
   UPDATE public.qrc_taxi_ia_receipts SET status='unknown',finished_at=now(),error_message='Résultat inconnu : aucune nouvelle correction automatique.' WHERE id=r.id RETURNING * INTO r;
  END IF;
  IF NOT (p_retry AND r.status='error' AND r.http_status IN (429,500,502,503,504) AND r.attempt<3 AND r.retry_at<=now()) THEN
   RETURN jsonb_build_object('claimed',false,'receipt',to_jsonb(r));
  END IF;
 END IF;
 n:=coalesce(r.attempt,0)+1;
 SELECT * INTO g FROM public.qrc_taxi_ia_gate WHERE id=true;
 IF g.paused THEN RETURN jsonb_build_object('claimed',false,'blocked',true,'status',g.http_status,'message',g.message); END IF;
 UPDATE public.qrc_taxi_ia_receipts SET status='unknown',finished_at=now(),error_message='Résultat inconnu : aucune nouvelle correction automatique.' WHERE user_id=p_user AND status='active' AND created_at<now()-interval '5 minutes';
 IF EXISTS(SELECT 1 FROM public.qrc_taxi_ia_receipts WHERE user_id=p_user AND status='active') THEN
  RETURN jsonb_build_object('claimed',false,'blocked',true,'status',409,'message','Une correction est déjà en cours pour ce compte.');
 END IF;
 IF (SELECT count(*) FROM public.qrc_taxi_ia_receipts WHERE user_id=p_user AND created_at>now()-interval '1 hour')>=60 OR (SELECT count(*) FROM public.qrc_taxi_ia_receipts WHERE user_id=p_user AND created_at>now()-interval '24 hours')>=200 THEN
  RETURN jsonb_build_object('claimed',false,'blocked',true,'status',429,'message','Limite atteinte : 60 corrections par heure et 200 par jour.');
 END IF;
 INSERT INTO public.qrc_taxi_ia_receipts(user_id,identity_hash,quiz,version,question_id,answer_hash,attempt) VALUES(p_user,p_identity,p_quiz,p_version,p_question,p_answer_hash,n) RETURNING * INTO r;
 RETURN jsonb_build_object('claimed',true,'receipt',to_jsonb(r));
END $$;
REVOKE ALL ON FUNCTION public.qrc_taxi_ia_claim(uuid,text,text,text,integer,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_taxi_ia_claim(uuid,text,text,text,integer,text,boolean) TO service_role;
COMMENT ON TABLE public.qrc_taxi_ia_receipts IS 'Optional TAXI practice only. No raw answers, no official grades or progression. Append-only retry identities. Unknown provider outcomes are never replayed.';