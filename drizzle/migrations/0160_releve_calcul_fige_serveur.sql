CREATE TABLE public.releve_jalons_calcul_fige (
  gel_id uuid PRIMARY KEY REFERENCES public.releve_jalons_fin_acces(id),
  calcul jsonb NOT NULL,
  methode text NOT NULL,
  code_ref text NOT NULL,
  base_gel_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.releve_jalons_calcul_fige TO authenticated;
GRANT ALL ON public.releve_jalons_calcul_fige TO service_role;
ALTER TABLE public.releve_jalons_calcul_fige ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les calculs figés" ON public.releve_jalons_calcul_fige FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.releve_jalons_calcul_fige IS 'Calcul complet des jalons (volumes, poids, durées, résultat) calculé côté serveur à la création du gel ; append-only, une ligne par version de gel.';

CREATE OR REPLACE FUNCTION public.releve_calcul_fige_immuable() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Calcul figé immuable' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER trg_releve_calcul_fige_immuable BEFORE UPDATE OR DELETE ON public.releve_jalons_calcul_fige FOR EACH ROW EXECUTE FUNCTION public.releve_calcul_fige_immuable();

COMMENT ON TABLE public.releve_jalons_resolution IS 'DEPRECATED: remplacée par releve_jalons_calcul_fige (calcul serveur au gel, jamais à la première lecture). Jamais utilisée (0 ligne).';

CREATE OR REPLACE FUNCTION public.releve_demander_resolution() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/resoudre-releves-gel',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2Rzb2h5dWlnam1jbGVtcWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDcxNTQsImV4cCI6MjA4NTcyMzE1NH0.9YXj7SGVrhlrQ6EuBzdaAit0sCSn9BQ8HCxau6QAies"}'::jsonb,
    body := '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.alertes_systeme (type, titre, message, details)
  VALUES ('gel_releve_echec', 'Calcul figé non demandé', 'La demande de calcul figé a échoué ; nouvel essai à la prochaine exécution horaire.', SQLSTATE);
END $$;
REVOKE ALL ON FUNCTION public.releve_demander_resolution() FROM PUBLIC, anon, authenticated;

-- Fin d'accès : un archivage administratif ne compte que si l'accès est réellement retiré (compte désactivé).
CREATE OR REPLACE FUNCTION public.fin_acces_elearning(_id uuid)
 RETURNS date LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a record; _today date := (now() AT TIME ZONE 'Europe/Paris')::date; _fin date; _retire boolean := false;
BEGIN
  SELECT type_apprenant, formation_choisie, date_fin_cours_en_ligne, compte_cours_archive_at, auth_user_id INTO a FROM public.apprenants WHERE id = _id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (lower(btrim(coalesce(a.type_apprenant,''))) IN ('vtc-e','taxi-e','ta-e','va-e')
       OR lower(btrim(coalesce(a.formation_choisie,''))) IN ('vtc-e','taxi-e','ta-e','va-e')) THEN RETURN NULL; END IF;
  IF a.compte_cours_archive_at IS NOT NULL AND a.auth_user_id IS NOT NULL THEN
    SELECT coalesce(u.banned_until > now(), false) INTO _retire FROM auth.users u WHERE u.id = a.auth_user_id;
  END IF;
  IF coalesce(_retire, false) THEN
    RETURN LEAST(coalesce(a.date_fin_cours_en_ligne, (a.compte_cours_archive_at AT TIME ZONE 'Europe/Paris')::date),
                 (a.compte_cours_archive_at AT TIME ZONE 'Europe/Paris')::date);
  END IF;
  _fin := a.date_fin_cours_en_ligne;
  IF _fin IS NULL OR _fin >= _today THEN RETURN NULL; END IF;
  IF EXISTS (
    SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id
    WHERE sa.apprenant_id = _id
      AND lower(coalesce(s.nom,'') || ' ' || coalesce(s.type_session,'')) !~ '(e-?learning|elearning|en\s*ligne)'
      AND lower(coalesce(s.nom,'') || ' ' || coalesce(s.type_session,'')) ~ '(présentiel|presentiel|pratique|théorie|theorie|session|vtc|taxi|\mta\M|\mva\M)'
      AND coalesce(sa.date_fin, s.date_fin, sa.date_debut, s.date_debut) >= _today
  ) THEN RETURN NULL; END IF;
  RETURN _fin;
END $function$;

CREATE OR REPLACE FUNCTION public.geler_releves_fin_acces()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE a record; _fin date; _contenu jsonb; _n integer := 0; _today date := (now() AT TIME ZONE 'Europe/Paris')::date; _modifs integer;
BEGIN
  FOR a IN SELECT id FROM public.apprenants
    WHERE (lower(btrim(coalesce(type_apprenant,''))) IN ('vtc-e','taxi-e','ta-e','va-e') OR lower(btrim(coalesce(formation_choisie,''))) IN ('vtc-e','taxi-e','ta-e','va-e'))
      AND NOT EXISTS (SELECT 1 FROM public.releve_jalons_fin_acces g WHERE g.apprenant_id = apprenants.id)
  LOOP
    BEGIN
      _fin := public.fin_acces_elearning(a.id);
      CONTINUE WHEN _fin IS NULL;
      PERFORM pg_advisory_xact_lock(hashtext('releve_fin_acces:' || a.id::text));
      CONTINUE WHEN EXISTS (SELECT 1 FROM public.releve_jalons_fin_acces g WHERE g.apprenant_id = a.id);
      IF _contenu IS NULL THEN _contenu := public.releve_figer_contenu(); END IF;
      SELECT count(*) INTO _modifs FROM public.module_editor_state
        WHERE updated_at >= ((_fin + 1)::timestamp AT TIME ZONE 'Europe/Paris');
      INSERT INTO public.releve_jalons_fin_acces (apprenant_id, version, fin_acces, nature, historique_prouve, contenu, sources, methode_version, modules_modifies_apres_fin)
      VALUES (a.id, 1, _fin,
        CASE WHEN _fin >= _today - 1 THEN 'fin_acces' ELSE 'protection_apres_fin' END,
        _fin >= _today - 1 AND _modifs = 0, _contenu, public.releve_sources_apprenant(a.id), 'gel-v2', _modifs);
      _n := _n + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details)
      VALUES ('gel_releve_echec', 'Gel du relevé non réalisé', 'Le gel automatique du relevé a échoué ; nouvel essai à la prochaine exécution.', 'apprenant ' || a.id::text || ' : ' || SQLSTATE);
    END;
  END LOOP;
  -- Calcul complet figé côté serveur pour tout gel qui n'en a pas encore (nouveau ou en échec précédent).
  IF EXISTS (SELECT 1 FROM public.releve_jalons_fin_acces g WHERE NOT EXISTS (SELECT 1 FROM public.releve_jalons_calcul_fige c WHERE c.gel_id = g.id)) THEN
    PERFORM public.releve_demander_resolution();
  END IF;
  RETURN _n;
END $function$;

CREATE OR REPLACE FUNCTION public.releve_ajout_pratique_apres_gel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _d public.releve_jalons_fin_acces;
BEGIN
  IF NEW.categorie IS DISTINCT FROM 'pratique' OR NEW.date_presence IS NULL OR length(btrim(coalesce(NEW.motif,''))) < 3 THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('releve_fin_acces:' || NEW.apprenant_id::text));
  SELECT * INTO _d FROM public.releve_jalons_fin_acces WHERE apprenant_id = NEW.apprenant_id ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_d.sources->'heures_validees') e WHERE e->>'id' = NEW.id::text) THEN RETURN NEW; END IF;
  INSERT INTO public.releve_jalons_fin_acces (apprenant_id, version, fin_acces, nature, historique_prouve, contenu, sources, heures_validee_id, remplace_id, cree_par, methode_version, modules_modifies_apres_fin)
  VALUES (NEW.apprenant_id, _d.version + 1, _d.fin_acces, 'ajout_pratique_admin', _d.historique_prouve, _d.contenu,
    jsonb_set(_d.sources, '{heures_validees}', coalesce(_d.sources->'heures_validees','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', NEW.id, 'heures', NEW.heures, 'created_at', NEW.created_at, 'date_presence', NEW.date_presence, 'categorie', NEW.categorie, 'motif', NEW.motif))),
    NEW.id, _d.id, auth.uid(), _d.methode_version, _d.modules_modifies_apres_fin)
  ON CONFLICT (heures_validee_id) DO NOTHING;
  PERFORM public.releve_demander_resolution();
  RETURN NEW;
END $function$;