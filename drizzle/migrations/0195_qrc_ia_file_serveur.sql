-- lovable-cron-fallback-reviewed: reconciliation SQL-only every 10 min (bounded 50 passages, window since auto cutoff, no AI call); creates forgotten queue rows only.
ALTER TABLE public.qrc_ia_suites ADD COLUMN IF NOT EXISTS origine text;
ALTER TABLE public.qrc_ia_suites ADD COLUMN IF NOT EXISTS dernier_code text;
ALTER TABLE public.qrc_ia_suites ADD COLUMN IF NOT EXISTS dernier_run_id text;
ALTER TABLE public.qrc_ia_suites ADD COLUMN IF NOT EXISTS maj_at timestamptz;

-- Same rule as estApprenantElearning (supabase/functions/_shared/qrcIaRegles.ts).
CREATE OR REPLACE FUNCTION public.qrc_ia_type_elearning(p_type text, p_modalite text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT lower(trim(coalesce(p_modalite,''))) ~ '^elearning_(synchrone|asynchrone)$'
  OR (lower(trim(coalesce(p_type,''))) <> '' AND (
       lower(trim(p_type)) LIKE '%e-learning%' OR lower(trim(p_type)) LIKE '%elearning%'
    OR lower(trim(p_type)) ~ '(^|[[:space:]-])[a-z]{2,4}-e($|-)' OR lower(trim(p_type)) LIKE '%-e'))
$$;

-- Admissibility for automatic queueing: new e-learning passages since activation
-- and the 20/10 09:53Z cutoff only; never présentiel, tests, Ismail AMAR, history.
CREATE OR REPLACE FUNCTION public.qrc_ia_raison_file(p_attempt uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; a record; ap record;
BEGIN
 SELECT * INTO c FROM public.qrc_ia_config WHERE id;
 IF NOT FOUND OR NOT c.actif OR c.actif_depuis IS NULL THEN RETURN 'ia_desactivee'; END IF;
 SELECT attempt_id, apprenant_id, etat, finished_at, is_test INTO a FROM public.exam_attempts_v2 WHERE attempt_id=p_attempt;
 IF NOT FOUND THEN RETURN 'passage_introuvable'; END IF;
 IF a.etat<>'terminee' OR a.finished_at IS NULL THEN RETURN 'passage_non_termine'; END IF;
 IF a.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN 'exclu'; END IF;
 IF a.is_test OR EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id) THEN RETURN 'compte_test'; END IF;
 IF a.finished_at < greatest(c.actif_depuis, timestamptz '2026-10-20 09:53+00') THEN RETURN 'hors_periode'; END IF;
 SELECT type_apprenant, modalite_formation INTO ap FROM public.apprenants WHERE id=a.apprenant_id;
 IF NOT FOUND OR NOT public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation) THEN RETURN 'non_elearning'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.qrc_instances_v2 q WHERE q.attempt_id=p_attempt AND q.etat='en_attente' AND q.reponse IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id)) THEN RETURN 'rien_a_corriger'; END IF;
 RETURN 'admissible';
END $$;

-- Idempotent, transactional queueing. Reopens only a falsely "terminee" queue (or a
-- global pause after explicit admin resume); never reopens a review (a_verifier).
CREATE OR REPLACE FUNCTION public.qrc_ia_enfiler(p_attempt uuid, p_origine text DEFAULT 'serveur') RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r text; s public.qrc_ia_suites; ins uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND current_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 r := public.qrc_ia_raison_file(p_attempt);
 IF r<>'admissible' THEN RETURN r; END IF;
 INSERT INTO public.qrc_ia_suites(attempt_id, origine, maj_at, dernier_code) VALUES(p_attempt, left(p_origine,40), now(), 'en_file')
 ON CONFLICT (attempt_id) DO NOTHING RETURNING attempt_id INTO ins;
 IF ins IS NOT NULL THEN RETURN 'en_file'; END IF;
 SELECT * INTO s FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF s.statut IN ('attente','en_cours') THEN RETURN 'deja_en_file'; END IF;
 IF s.statut='terminee' OR (s.statut='pause' AND EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL)) THEN
  IF s.remaining<=0 THEN
   UPDATE public.qrc_ia_suites SET statut='a_verifier', message='Budget épuisé alors que des QRC admissibles restent', dernier_code='budget_epuise', maj_at=now() WHERE attempt_id=p_attempt;
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Budget de continuation épuisé avec des QRC restantes.',jsonb_build_object('attempt_id',p_attempt,'code','budget_epuise')::text,false);
   RETURN 'revue_budget';
  END IF;
  UPDATE public.qrc_ia_suites SET statut='attente', next_at=now(), dispatches=0, lease_until=NULL,
   message='Réouverte ('||left(p_origine,40)||') : QRC admissibles sans trace', dernier_code='reouverte', maj_at=now() WHERE attempt_id=p_attempt;
  RETURN 'reouverte';
 END IF;
 RETURN 'revue_existante';
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_enfiler(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_enfiler(uuid,text) TO service_role;

-- Server-side queueing at passage end, independent of the learner tab. Never blocks finalisation.
CREATE OR REPLACE FUNCTION public.qrc_ia_enfiler_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 BEGIN
  PERFORM public.qrc_ia_enfiler(NEW.attempt_id, 'declencheur_' || TG_TABLE_NAME);
 EXCEPTION WHEN others THEN
  BEGIN
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_file','Mise en file IA échouée',
    'Passage conservé ; la réconciliation automatique réessaiera.', jsonb_build_object('attempt_id',NEW.attempt_id,'code',SQLSTATE)::text,false);
  EXCEPTION WHEN others THEN NULL;
  END;
 END;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_qrc_ia_enfiler_passage ON public.exam_attempts_v2;
CREATE TRIGGER trg_qrc_ia_enfiler_passage AFTER UPDATE OF etat ON public.exam_attempts_v2
 FOR EACH ROW WHEN (NEW.etat='terminee' AND OLD.etat IS DISTINCT FROM 'terminee') EXECUTE FUNCTION public.qrc_ia_enfiler_trigger();
DROP TRIGGER IF EXISTS trg_qrc_ia_enfiler_qrc ON public.qrc_instances_v2;
CREATE TRIGGER trg_qrc_ia_enfiler_qrc AFTER INSERT ON public.qrc_instances_v2
 FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_enfiler_trigger();

-- Claim lease shortened: one AI call is capped at 60 s, an interrupted run no
-- longer blocks the whole single-flight queue for an hour.
CREATE OR REPLACE FUNCTION public.qrc_ia_suite_claim(p_attempt uuid,p_token uuid DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.qrc_ia_suites;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 IF p_token IS NULL THEN INSERT INTO public.qrc_ia_suites(attempt_id,origine) VALUES(p_attempt,'rattrapage_admin') ON CONFLICT DO NOTHING; END IF;
 SELECT * INTO j FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR (p_token IS NOT NULL AND j.token<>p_token) OR j.statut<>'attente' OR j.remaining<=0 OR j.next_at>now() THEN RETURN false; END IF;
 UPDATE public.qrc_ia_suites SET statut='en_cours',remaining=remaining-1,lease_until=now()+interval '10 minutes',maj_at=now() WHERE attempt_id=p_attempt;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.qrc_ia_dispatch_suites() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
DECLARE j record; n integer:=0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(74201953) THEN RETURN 0; END IF;
 FOR j IN SELECT * FROM public.qrc_ia_suites WHERE (statut='en_cours' AND lease_until<now()) OR (statut='attente' AND dispatches>=48) FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET statut='a_verifier',message='Interruption ou livraisons échouées : revue requise, aucune reprise aveugle',
   dernier_code=CASE WHEN j.statut='en_cours' THEN 'bail_expire_issue_inconnue' ELSE 'livraisons_epuisees' END, maj_at=now() WHERE attempt_id=j.attempt_id;
  INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Interruption ou budget de livraisons épuisé ; aucun nouvel appel IA automatique.',jsonb_build_object('attempt_id',j.attempt_id,'code',CASE WHEN j.statut='en_cours' THEN 'bail_expire_issue_inconnue' ELSE 'livraisons_epuisees' END)::text,false);
 END LOOP;
 FOR j IN SELECT s.* FROM public.qrc_ia_suites s WHERE s.statut='attente' AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.attempt_id=s.attempt_id) FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET statut='a_verifier',message='Passage introuvable : suite non exécutable, revue requise',dernier_code='passage_introuvable',maj_at=now() WHERE attempt_id=j.attempt_id;
  INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Suite de correction sans passage existant ; aucun appel IA.',jsonb_build_object('attempt_id',j.attempt_id,'code','passage_introuvable')::text,false);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL) THEN
 IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_suites WHERE statut='en_cours') THEN
 FOR j IN SELECT * FROM public.qrc_ia_suites WHERE statut='attente' AND next_at<=now() AND remaining>0 AND dispatches<48 ORDER BY next_at LIMIT 1 FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.qrc_ia_suites SET dispatches=dispatches+1 WHERE attempt_id=j.attempt_id;
  PERFORM net.http_post(url:='https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/qrc-ia-correction',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('attempt_id',j.attempt_id,'suite_token',j.token));
  n:=n+1;
 END LOOP;
 END IF;
 ELSE
 UPDATE public.qrc_ia_suites SET statut='pause',message='Correction IA désactivée ou en pause globale',dernier_code='pause_globale',maj_at=now() WHERE statut='attente';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.qrc_ia_suites WHERE statut IN ('attente','en_cours')) THEN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='qrc-ia-suites-bornees') THEN PERFORM cron.unschedule('qrc-ia-suites-bornees'); END IF;
 END IF;
 RETURN n;
END $function$;

-- Clear per-QRC status for admins: corrigee, sans_reponse, en_cours, en_file,
-- revue, en_attente (not queued). Covers e-learning passages with a queue row or
-- in the automatic window. No answer content is returned.
CREATE OR REPLACE FUNCTION public.qrc_ia_bilan_statuts() RETURNS TABLE(qrc_instance_id uuid, attempt_id uuid, apprenant_id uuid, exam_id text, finished_at timestamptz, statut text, suite_statut text, suite_code text, trace_statut text, trace_http integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.has_role(auth.uid(),'admin') AND current_user NOT IN ('postgres','supabase_admin') THEN
  RAISE EXCEPTION 'Admin uniquement' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 WITH cfg AS (SELECT greatest(actif_depuis, timestamptz '2026-10-20 09:53+00') AS debut FROM public.qrc_ia_config WHERE id),
 p AS (
  SELECT a.attempt_id, a.apprenant_id, a.exam_id::text AS exam_id, a.finished_at, s.statut AS s_statut, s.dernier_code
  FROM public.exam_attempts_v2 a JOIN public.apprenants ap ON ap.id=a.apprenant_id
  LEFT JOIN public.qrc_ia_suites s ON s.attempt_id=a.attempt_id
  WHERE a.etat='terminee' AND NOT a.is_test AND a.apprenant_id<>'c0844007-b999-4385-9665-918e5077c3b5'
    AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id)
    AND public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation)
    AND (s.attempt_id IS NOT NULL OR a.finished_at >= (SELECT debut FROM cfg))
 ),
 t AS (
  SELECT q.qrc_instance_id, q.attempt_id, q.etat, q.reponse IS NULL AS vide,
   (SELECT c.statut FROM public.qrc_ia_corrections c WHERE c.qrc_instance_id=q.qrc_instance_id ORDER BY c.created_at DESC LIMIT 1) AS c_statut,
   (SELECT c.http_status FROM public.qrc_ia_corrections c WHERE c.qrc_instance_id=q.qrc_instance_id ORDER BY c.created_at DESC LIMIT 1) AS c_http,
   (SELECT c.motif FROM public.qrc_ia_corrections c WHERE c.qrc_instance_id=q.qrc_instance_id ORDER BY c.created_at DESC LIMIT 1) AS c_motif,
   (SELECT r.statut FROM public.qrc_ia_reprises r WHERE r.qrc_instance_id=q.qrc_instance_id ORDER BY r.numero DESC LIMIT 1) AS r_statut,
   (SELECT r.http_status FROM public.qrc_ia_reprises r WHERE r.qrc_instance_id=q.qrc_instance_id ORDER BY r.numero DESC LIMIT 1) AS r_http
  FROM public.qrc_instances_v2 q WHERE q.attempt_id IN (SELECT p.attempt_id FROM p)
 )
 SELECT t.qrc_instance_id, p.attempt_id, p.apprenant_id, p.exam_id, p.finished_at,
  CASE
   WHEN t.etat='corrigee' THEN 'corrigee'
   WHEN t.vide OR t.c_motif='reponse_vide' THEN 'sans_reponse'
   WHEN coalesce(t.r_statut,t.c_statut)='en_cours' AND p.s_statut='en_cours' THEN 'en_cours'
   WHEN coalesce(t.r_statut,t.c_statut) IN ('en_cours','a_verifier','exclue') THEN 'revue'
   WHEN p.s_statut IN ('attente','en_cours') THEN 'en_file'
   WHEN p.s_statut IN ('a_verifier','pause') THEN 'revue'
   ELSE 'en_attente'
  END,
  p.s_statut, p.dernier_code, coalesce(t.r_statut,t.c_statut), coalesce(t.r_http,t.c_http)
 FROM t JOIN p ON p.attempt_id=t.attempt_id;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_bilan_statuts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_bilan_statuts() TO authenticated, service_role;

-- Bounded reconciliation: finds forgotten eligible passages in the automatic window,
-- queues them, and raises one completeness alert per day with the true remainder.
CREATE OR REPLACE FUNCTION public.qrc_ia_reconcilier() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; p record; r text; vus int:=0; en_file int:=0; reouv int:=0; nb_revue int; nb_attente int; nb_file int; cle text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(74201954) THEN RETURN jsonb_build_object('statut','verrou'); END IF;
 SELECT * INTO c FROM public.qrc_ia_config WHERE id;
 IF NOT FOUND OR NOT c.actif OR c.actif_depuis IS NULL THEN RETURN jsonb_build_object('statut','ia_desactivee'); END IF;
 FOR p IN
  SELECT DISTINCT a.attempt_id, a.finished_at
  FROM public.exam_attempts_v2 a
  JOIN public.apprenants ap ON ap.id=a.apprenant_id
  JOIN public.qrc_instances_v2 q ON q.attempt_id=a.attempt_id
  LEFT JOIN public.qrc_ia_suites s ON s.attempt_id=a.attempt_id
  WHERE a.etat='terminee' AND NOT a.is_test AND a.apprenant_id<>'c0844007-b999-4385-9665-918e5077c3b5'
    AND a.finished_at >= greatest(c.actif_depuis, timestamptz '2026-10-20 09:53+00') AND a.finished_at < now()-interval '2 minutes'
    AND public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation)
    AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id)
    AND q.etat='en_attente' AND q.reponse IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.qrc_ia_corrections x WHERE x.qrc_instance_id=q.qrc_instance_id)
    AND (s.attempt_id IS NULL OR s.statut IN ('terminee','pause'))
  ORDER BY a.finished_at LIMIT 50
 LOOP
  vus:=vus+1; r:=public.qrc_ia_enfiler(p.attempt_id,'reconciliation');
  IF r='en_file' THEN en_file:=en_file+1; ELSIF r='reouverte' THEN reouv:=reouv+1; END IF;
 END LOOP;
 SELECT count(*) FILTER (WHERE b.statut='revue'), count(*) FILTER (WHERE b.statut='en_attente'), count(*) FILTER (WHERE b.statut IN ('en_file','en_cours'))
  INTO nb_revue, nb_attente, nb_file FROM public.qrc_ia_bilan_statuts() b WHERE b.finished_at < now()-interval '1 hour';
 IF nb_revue+nb_attente>0 OR en_file+reouv>0 THEN
  cle:='completude:'||to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD');
  IF NOT EXISTS(SELECT 1 FROM public.alertes_systeme WHERE type='qrc_ia_completude' AND details LIKE '%"cle": "'||cle||'"%') OR en_file+reouv>0 THEN
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_completude','Contrôle de complétude correction IA',
    nb_revue||' QRC en revue, '||nb_attente||' non mises en file, '||nb_file||' en file depuis plus d''1 h ; '||en_file||' passage(s) oublié(s) mis en file, '||reouv||' réouvert(s).',
    jsonb_build_object('cle',cle,'revue',nb_revue,'non_en_file',nb_attente,'en_file',nb_file,'mis_en_file',en_file,'reouverts',reouv)::text,false);
  END IF;
 END IF;
 RETURN jsonb_build_object('vus',vus,'mis_en_file',en_file,'reouverts',reouv,'revue',nb_revue,'non_en_file',nb_attente,'en_file',nb_file);
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_reconcilier() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_reconcilier() TO service_role;
REVOKE ALL ON FUNCTION public.qrc_ia_raison_file(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_raison_file(uuid) TO service_role;

SELECT cron.schedule('qrc-ia-reconciliation', '*/10 * * * *', $$SELECT public.qrc_ia_reconcilier();$$);