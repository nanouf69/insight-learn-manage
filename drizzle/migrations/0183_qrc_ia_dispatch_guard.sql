ALTER TABLE public.qrc_ia_suites ADD COLUMN dispatches integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.qrc_ia_dispatch_suites() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE j record; n integer:=0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(74201953) THEN RETURN 0; END IF;
 FOR j IN SELECT * FROM public.qrc_ia_suites WHERE (statut='en_cours' AND lease_until<now()) OR (statut='attente' AND dispatches>=48) FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET statut='a_verifier',message='Interruption ou livraisons échouées : revue requise, aucune reprise aveugle' WHERE attempt_id=j.attempt_id;
  INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Interruption ou budget de livraisons épuisé ; aucun nouvel appel IA automatique.',jsonb_build_object('attempt_id',j.attempt_id)::text,false);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL) THEN
 IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_suites WHERE statut='en_cours') THEN
 FOR j IN SELECT * FROM public.qrc_ia_suites WHERE statut='attente' AND next_at<=now() AND remaining>0 AND dispatches<48 ORDER BY next_at LIMIT 1 FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET next_at=now()+interval '2 minutes',dispatches=dispatches+1 WHERE attempt_id=j.attempt_id;
  PERFORM net.http_post(url:='https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/qrc-ia-correction',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('attempt_id',j.attempt_id,'suite_token',j.token));
  n:=n+1;
 END LOOP;
 END IF;
 ELSE
 -- Stop pending chains on a global pause; reactivation never replays old work automatically.
 UPDATE public.qrc_ia_suites SET statut='pause',message='Correction IA désactivée ou en pause globale' WHERE statut='attente';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_suites WHERE statut IN ('attente','en_cours')) THEN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='qrc-ia-suites-bornees') THEN PERFORM cron.unschedule('qrc-ia-suites-bornees'); END IF;
 END IF;
 RETURN n;
END $$;