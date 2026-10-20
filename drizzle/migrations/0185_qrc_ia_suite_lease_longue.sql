CREATE OR REPLACE FUNCTION public.qrc_ia_suite_claim(p_attempt uuid,p_token uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.qrc_ia_suites;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 IF p_token IS NULL THEN INSERT INTO public.qrc_ia_suites(attempt_id) VALUES(p_attempt) ON CONFLICT DO NOTHING; END IF;
 SELECT * INTO j FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR (p_token IS NOT NULL AND j.token<>p_token) OR j.statut<>'attente' OR j.remaining<=0 OR j.next_at>now() THEN RETURN false; END IF;
 UPDATE public.qrc_ia_suites SET statut='en_cours',remaining=remaining-1,lease_until=now()+interval '1 hour' WHERE attempt_id=p_attempt;
 RETURN true;
END $$;