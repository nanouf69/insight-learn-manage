-- lovable-cron-fallback-reviewed: queue-backed, scheduled only on enqueue and unscheduled when the queue drains; bounded 3 items/minute, needed for retry delays and lease expiry.
CREATE TABLE IF NOT EXISTS public.qrc_ia_budget_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  plafond_eur numeric NOT NULL DEFAULT 20 CHECK (plafond_eur >= 0),
  eur_par_credit numeric NOT NULL DEFAULT 1.0 CHECK (eur_par_credit > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.qrc_ia_budget_config(id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.qrc_ia_budget_config TO authenticated;
GRANT ALL ON public.qrc_ia_budget_config TO service_role;
ALTER TABLE public.qrc_ia_budget_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_lecture ON public.qrc_ia_budget_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.qrc_ia_budget_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mois text NOT NULL,
  source text NOT NULL,
  ref text NOT NULL,
  reserve_eur numeric NOT NULL CHECK (reserve_eur >= 0),
  reel_eur numeric,
  statut text NOT NULL DEFAULT 'reservee' CHECK (statut IN ('reservee','reglee','inconnue','annulee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  regle_at timestamptz
);
CREATE INDEX IF NOT EXISTS qrc_ia_budget_reservations_mois ON public.qrc_ia_budget_reservations(mois);
GRANT SELECT ON public.qrc_ia_budget_reservations TO authenticated;
GRANT ALL ON public.qrc_ia_budget_reservations TO service_role;
ALTER TABLE public.qrc_ia_budget_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_lecture ON public.qrc_ia_budget_reservations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.qrc_ia_mois_paris(p timestamptz DEFAULT now()) RETURNS text
LANGUAGE sql STABLE SET search_path=public AS $$ SELECT to_char(p AT TIME ZONE 'Europe/Paris','YYYY-MM') $$;

CREATE OR REPLACE FUNCTION public.qrc_ia_budget_engage(p_mois text) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(sum(CASE WHEN statut='reglee' THEN coalesce(reel_eur,reserve_eur) WHEN statut='annulee' THEN 0 ELSE reserve_eur END),0)
 FROM public.qrc_ia_budget_reservations WHERE mois=p_mois
$$;
REVOKE ALL ON FUNCTION public.qrc_ia_budget_engage(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_budget_engage(text) TO service_role;

CREATE OR REPLACE FUNCTION public.qrc_ia_budget_reserver(p_source text, p_ref text, p_credits_max numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.qrc_ia_budget_config; m text := public.qrc_ia_mois_paris(); montant numeric; r uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 IF p_credits_max IS NULL OR p_credits_max <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
 PERFORM pg_advisory_xact_lock(74201960);
 SELECT * INTO c FROM public.qrc_ia_budget_config WHERE id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 montant := p_credits_max * c.eur_par_credit;
 IF public.qrc_ia_budget_engage(m) + montant > c.plafond_eur THEN RETURN NULL; END IF;
 INSERT INTO public.qrc_ia_budget_reservations(mois,source,ref,reserve_eur) VALUES(m,left(p_source,40),left(p_ref,200),montant) RETURNING id INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_budget_reserver(text,text,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_budget_reserver(text,text,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.qrc_ia_budget_regler(p_id uuid, p_credits_reels numeric, p_annuler boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.qrc_ia_budget_config;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.qrc_ia_budget_config WHERE id;
 UPDATE public.qrc_ia_budget_reservations SET
   statut = CASE WHEN p_annuler THEN 'annulee' WHEN p_credits_reels IS NULL THEN 'inconnue' ELSE 'reglee' END,
   reel_eur = CASE WHEN p_annuler THEN 0 WHEN p_credits_reels IS NULL THEN NULL ELSE p_credits_reels * c.eur_par_credit END,
   regle_at = now()
 WHERE id=p_id AND statut='reservee';
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_budget_regler(uuid,numeric,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_budget_regler(uuid,numeric,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.qrc_ia_budget_etat() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.qrc_ia_budget_config; m text := public.qrc_ia_mois_paris();
BEGIN
 IF NOT (auth.role()='service_role' OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Réservé administration' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.qrc_ia_budget_config WHERE id;
 RETURN jsonb_build_object('mois',m,'plafond_eur',c.plafond_eur,'eur_par_credit',c.eur_par_credit,'engage_eur',public.qrc_ia_budget_engage(m));
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_budget_etat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_budget_etat() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.controle_qrc_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  exercice_id text NOT NULL,
  source_reponse_id uuid,
  empreinte text NOT NULL,
  qcm_bons integer NOT NULL DEFAULT 0,
  qcm_total integer NOT NULL DEFAULT 0,
  qrc_total integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','corrigee','a_verifier')),
  note_points integer,
  note_total integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  termine_at timestamptz,
  UNIQUE (apprenant_id, exercice_id, empreinte)
);
CREATE INDEX IF NOT EXISTS controle_qrc_copies_user ON public.controle_qrc_copies(user_id, exercice_id, created_at DESC);
GRANT SELECT ON public.controle_qrc_copies TO authenticated;
GRANT ALL ON public.controle_qrc_copies TO service_role;
ALTER TABLE public.controle_qrc_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY lecture_proprietaire_ou_admin ON public.controle_qrc_copies FOR SELECT TO authenticated
 USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.controle_qrc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copie_id uuid NOT NULL REFERENCES public.controle_qrc_copies(id),
  question_id text NOT NULL,
  enonce text NOT NULL,
  corrige text NOT NULL,
  mots_cles jsonb NOT NULL DEFAULT '[]'::jsonb,
  reponse text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','en_cours','corrigee','a_verifier')),
  est_correct boolean,
  points integer,
  note_ia numeric,
  commentaire text,
  motif text,
  essais integer NOT NULL DEFAULT 0,
  next_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  token uuid,
  run_id text,
  http_status integer,
  maj_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (copie_id, question_id)
);
CREATE INDEX IF NOT EXISTS controle_qrc_items_due ON public.controle_qrc_items(statut, next_at);
GRANT SELECT ON public.controle_qrc_items TO authenticated;
GRANT ALL ON public.controle_qrc_items TO service_role;
ALTER TABLE public.controle_qrc_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY lecture_proprietaire_ou_admin ON public.controle_qrc_items FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.controle_qrc_copies c WHERE c.id=copie_id AND (c.user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE OR REPLACE FUNCTION public.controle_qrc_items_garde() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.statut='corrigee' THEN RAISE EXCEPTION 'Correction publiée immuable' USING ERRCODE='P0550'; END IF;
 IF NEW.enonce<>OLD.enonce OR NEW.corrige<>OLD.corrige OR NEW.reponse<>OLD.reponse OR NEW.question_id<>OLD.question_id OR NEW.copie_id<>OLD.copie_id THEN
  RAISE EXCEPTION 'Copie figée' USING ERRCODE='P0550';
 END IF;
 NEW.maj_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER trg_controle_qrc_items_garde BEFORE UPDATE ON public.controle_qrc_items FOR EACH ROW EXECUTE FUNCTION public.controle_qrc_items_garde();
CREATE OR REPLACE FUNCTION public.controle_qrc_sans_suppression() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Suppression interdite' USING ERRCODE='P0550'; END $$;
CREATE TRIGGER trg_controle_qrc_items_sans_suppression BEFORE DELETE ON public.controle_qrc_items FOR EACH ROW EXECUTE FUNCTION public.controle_qrc_sans_suppression();
CREATE TRIGGER trg_controle_qrc_copies_sans_suppression BEFORE DELETE ON public.controle_qrc_copies FOR EACH ROW EXECUTE FUNCTION public.controle_qrc_sans_suppression();

CREATE OR REPLACE FUNCTION public.controle_qrc_cloturer(p_copie uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n_total int; n_ok int; n_rev int; n_juste int; c public.controle_qrc_copies;
BEGIN
 SELECT * INTO c FROM public.controle_qrc_copies WHERE id=p_copie FOR UPDATE;
 IF NOT FOUND OR c.statut='corrigee' THEN RETURN; END IF;
 SELECT count(*), count(*) FILTER (WHERE statut='corrigee'), count(*) FILTER (WHERE statut='a_verifier'), count(*) FILTER (WHERE statut='corrigee' AND est_correct)
   INTO n_total, n_ok, n_rev, n_juste FROM public.controle_qrc_items WHERE copie_id=p_copie;
 IF n_ok = n_total THEN
  UPDATE public.controle_qrc_copies SET statut='corrigee', note_points=qcm_bons+n_juste, note_total=qcm_total+qrc_total, termine_at=now() WHERE id=p_copie;
 ELSIF n_ok + n_rev = n_total THEN
  UPDATE public.controle_qrc_copies SET statut='a_verifier' WHERE id=p_copie AND statut<>'a_verifier';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.controle_qrc_cloturer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.controle_qrc_cloturer(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.controle_qrc_items_apres() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.statut IN ('corrigee','a_verifier') THEN PERFORM public.controle_qrc_cloturer(NEW.copie_id); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER trg_controle_qrc_items_apres AFTER UPDATE OF statut ON public.controle_qrc_items FOR EACH ROW EXECUTE FUNCTION public.controle_qrc_items_apres();

CREATE OR REPLACE FUNCTION public.controle_qrc_dispatch() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE j record; n int := 0; t uuid;
BEGIN
 IF NOT pg_try_advisory_xact_lock(74201961) THEN RETURN 0; END IF;
 FOR j IN SELECT id FROM public.controle_qrc_items WHERE statut='en_cours' AND lease_until < now() FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.controle_qrc_items SET statut='a_verifier', motif='issue_inconnue_bail_expire', lease_until=NULL WHERE id=j.id;
 END LOOP;
 IF EXISTS (SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL) THEN
  FOR j IN SELECT id FROM public.controle_qrc_items WHERE statut='en_attente' AND next_at <= now() ORDER BY next_at LIMIT 3 FOR UPDATE SKIP LOCKED LOOP
   t := gen_random_uuid();
   UPDATE public.controle_qrc_items SET statut='en_cours', token=t, lease_until=now()+interval '4 minutes' WHERE id=j.id;
   PERFORM net.http_post(url:='https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/controle-qrc-ia',
     headers:=jsonb_build_object('Content-Type','application/json'),
     body:=jsonb_build_object('action','traiter','item_id',j.id,'token',t));
   n := n + 1;
  END LOOP;
 END IF;
 -- File vide : plus aucune exécution planifiée.
 IF NOT EXISTS (SELECT 1 FROM public.controle_qrc_items WHERE statut IN ('en_attente','en_cours'))
    AND EXISTS (SELECT 1 FROM cron.job WHERE jobname='controle-qrc-dispatch') THEN
  PERFORM cron.unschedule('controle-qrc-dispatch');
 END IF;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.controle_qrc_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.controle_qrc_dispatch() TO service_role;

-- Réveil à la mise en file : programme la relève (si absente) puis envoie tout de suite.
CREATE OR REPLACE FUNCTION public.controle_qrc_armer() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='controle-qrc-dispatch') THEN
  PERFORM cron.schedule('controle-qrc-dispatch', '* * * * *', 'SELECT public.controle_qrc_dispatch();');
 END IF;
 RETURN public.controle_qrc_dispatch();
END $$;
REVOKE ALL ON FUNCTION public.controle_qrc_armer() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.controle_qrc_armer() TO service_role;