-- lovable-cron-fallback-reviewed: bounded queue wakes on enqueue, minute checks only while pending, unschedules after drain; needed delayed retries and interrupted-work alerts without rebilling
CREATE TABLE public.qrc_ia_suites(attempt_id uuid PRIMARY KEY, token uuid NOT NULL DEFAULT gen_random_uuid(), remaining integer NOT NULL DEFAULT 24, next_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, statut text NOT NULL DEFAULT 'attente', message text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.qrc_ia_suites TO authenticated; GRANT ALL ON public.qrc_ia_suites TO service_role;
ALTER TABLE public.qrc_ia_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_ia_suites_admin ON public.qrc_ia_suites FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.qrc_ia_suite_wake() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.statut IN ('attente','en_cours') THEN PERFORM cron.schedule('qrc-ia-suites-bornees','* * * * *','SELECT public.qrc_ia_dispatch_suites()'); END IF; RETURN NEW; END $$;
CREATE TRIGGER qrc_ia_suite_wake AFTER INSERT OR UPDATE OF statut ON public.qrc_ia_suites FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_suite_wake();
CREATE OR REPLACE FUNCTION public.qrc_ia_suite_claim(p_attempt uuid,p_token uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.qrc_ia_suites;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 IF p_token IS NULL THEN INSERT INTO public.qrc_ia_suites(attempt_id) VALUES(p_attempt) ON CONFLICT DO NOTHING; END IF;
 SELECT * INTO j FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR (p_token IS NOT NULL AND j.token<>p_token) OR j.statut<>'attente' OR j.remaining<=0 OR j.next_at>now() THEN RETURN false; END IF;
 UPDATE public.qrc_ia_suites SET statut='en_cours',remaining=remaining-1,lease_until=now()+interval '10 minutes' WHERE attempt_id=p_attempt;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_suite_claim(uuid,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.qrc_ia_suite_claim(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.qrc_ia_dispatch_suites() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE j record; n integer:=0;
BEGIN
 FOR j IN SELECT * FROM public.qrc_ia_suites WHERE statut='en_cours' AND lease_until<now() FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET statut='a_verifier',message='Invocation interrompue : issue inconnue, aucune reprise automatique' WHERE attempt_id=j.attempt_id;
  INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Invocation interrompue ; aucun nouvel appel IA automatique.',jsonb_build_object('attempt_id',j.attempt_id)::text,false);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL) THEN
 FOR j IN SELECT * FROM public.qrc_ia_suites WHERE statut='attente' AND next_at<=now() AND remaining>0 ORDER BY next_at LIMIT 1 FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET next_at=now()+interval '2 minutes' WHERE attempt_id=j.attempt_id;
  PERFORM net.http_post(url:='https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/qrc-ia-correction', headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('attempt_id',j.attempt_id,'suite_token',j.token));
  n:=n+1;
 END LOOP;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_suites WHERE statut IN ('attente','en_cours')) THEN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='qrc-ia-suites-bornees') THEN PERFORM cron.unschedule('qrc-ia-suites-bornees'); END IF;
 END IF;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_dispatch_suites() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.qrc_ia_dispatch_suites() TO service_role;