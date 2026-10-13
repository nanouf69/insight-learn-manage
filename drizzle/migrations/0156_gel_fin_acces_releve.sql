COMMENT ON TABLE public.releve_jalons_gels IS 'DEPRECATED: gel manuel remplacé par releve_jalons_fin_acces (gel automatique à la fin des accès)';

-- Contenu pédagogique figé, dédoublonné par empreinte (un module = une ligne par état).
CREATE TABLE public.contenu_module_fige (
  empreinte text PRIMARY KEY,
  module_id integer NOT NULL,
  module_data jsonb,
  deleted_exercices jsonb,
  deleted_cours jsonb,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contenu_module_fige TO authenticated;
GRANT ALL ON public.contenu_module_fige TO service_role;
ALTER TABLE public.contenu_module_fige ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent le contenu figé" ON public.contenu_module_fige FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Gel du relevé à la fin effective des accès (append-only, versions).
CREATE TABLE public.releve_jalons_fin_acces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  fin_acces date NOT NULL,
  nature text NOT NULL CHECK (nature IN ('fin_acces', 'protection_apres_fin', 'ajout_pratique_admin')),
  historique_prouve boolean NOT NULL,
  contenu jsonb NOT NULL,      -- { "module_id": "empreinte", ... }
  sources jsonb NOT NULL,      -- completions, emargements (sans image), heures validées
  heures_validee_id uuid UNIQUE,
  remplace_id uuid REFERENCES public.releve_jalons_fin_acces(id),
  cree_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, version)
);
GRANT SELECT ON public.releve_jalons_fin_acces TO authenticated;
GRANT ALL ON public.releve_jalons_fin_acces TO service_role;
ALTER TABLE public.releve_jalons_fin_acces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les gels fin d'accès" ON public.releve_jalons_fin_acces FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_contenu_module_fige_immuable BEFORE UPDATE OR DELETE ON public.contenu_module_fige
  FOR EACH ROW EXECUTE FUNCTION public.releve_jalons_gels_immuable();
CREATE TRIGGER trg_releve_fin_acces_immuable BEFORE UPDATE OR DELETE ON public.releve_jalons_fin_acces
  FOR EACH ROW EXECUTE FUNCTION public.releve_jalons_gels_immuable();

-- Fin effective des accès e-learning (même règle que la page élève) ; NULL = accès encore ouvert / non configuré.
CREATE OR REPLACE FUNCTION public.fin_acces_elearning(_id uuid)
RETURNS date LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; _today date := (now() AT TIME ZONE 'Europe/Paris')::date; _fin date;
BEGIN
  SELECT type_apprenant, formation_choisie, date_fin_cours_en_ligne, compte_cours_archive_at INTO a FROM public.apprenants WHERE id = _id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (lower(btrim(coalesce(a.type_apprenant,''))) IN ('vtc-e','taxi-e','ta-e','va-e')
       OR lower(btrim(coalesce(a.formation_choisie,''))) IN ('vtc-e','taxi-e','ta-e','va-e')) THEN RETURN NULL; END IF;
  IF a.compte_cours_archive_at IS NOT NULL THEN
    RETURN LEAST(coalesce(a.date_fin_cours_en_ligne, (a.compte_cours_archive_at AT TIME ZONE 'Europe/Paris')::date),
                 (a.compte_cours_archive_at AT TIME ZONE 'Europe/Paris')::date);
  END IF;
  _fin := a.date_fin_cours_en_ligne;
  IF _fin IS NULL OR _fin >= _today THEN RETURN NULL; END IF;
  -- Une session présentielle/pratique encore en cours ou future garde l'accès ouvert.
  IF EXISTS (
    SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id
    WHERE sa.apprenant_id = _id
      AND lower(coalesce(s.nom,'') || ' ' || coalesce(s.type_session,'')) !~ '(e-?learning|elearning|en\s*ligne)'
      AND lower(coalesce(s.nom,'') || ' ' || coalesce(s.type_session,'')) ~ '(présentiel|presentiel|pratique|théorie|theorie|session|vtc|taxi|\mta\M|\mva\M)'
      AND coalesce(sa.date_fin, s.date_fin, sa.date_debut, s.date_debut) >= _today
  ) THEN RETURN NULL; END IF;
  RETURN _fin;
END $$;

-- Sources serveur de l'élève à l'instant du gel (signatures : présence seulement, jamais l'image).
CREATE OR REPLACE FUNCTION public.releve_sources_apprenant(_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'completions', coalesce((SELECT jsonb_agg(jsonb_build_object('module_id', module_id, 'status', status, 'progress', progress, 'completed_at', completed_at) ORDER BY module_id) FROM public.apprenant_module_completion WHERE apprenant_id = _id), '[]'::jsonb),
    'emargements', coalesce((SELECT jsonb_agg(jsonb_build_object('date_emargement', date_emargement, 'demi_journee', demi_journee, 'absent', absent, 'masque', masque, 'signed_at', signed_at,
        'signature_data_url', CASE WHEN btrim(coalesce(signature_data_url,'')) <> '' THEN 'signee' END) ORDER BY date_emargement, demi_journee) FROM public.emargements_fc WHERE apprenant_id = _id), '[]'::jsonb),
    'heures_validees', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'heures', heures, 'created_at', created_at, 'date_presence', date_presence, 'categorie', categorie, 'motif', motif) ORDER BY created_at) FROM public.presentiel_heures_validees WHERE apprenant_id = _id), '[]'::jsonb)
  )
$$;

CREATE OR REPLACE FUNCTION public.releve_figer_contenu()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _map jsonb := '{}'::jsonb; _h text;
BEGIN
  FOR r IN SELECT module_id, module_data, deleted_exercices, deleted_cours, updated_at FROM public.module_editor_state LOOP
    _h := md5(r.module_id::text || '|' || coalesce(r.module_data::text,'') || '|' || coalesce(r.deleted_exercices::text,'') || '|' || coalesce(r.deleted_cours::text,''));
    _h := _h || md5(_h || r.module_id::text);
    INSERT INTO public.contenu_module_fige (empreinte, module_id, module_data, deleted_exercices, deleted_cours, source_updated_at)
    VALUES (_h, r.module_id, r.module_data, to_jsonb(r.deleted_exercices), to_jsonb(r.deleted_cours), r.updated_at)
    ON CONFLICT (empreinte) DO NOTHING;
    _map := _map || jsonb_build_object(r.module_id::text, _h);
  END LOOP;
  RETURN _map;
END $$;

-- Tâche serveur : fige chaque élève dont les accès sont terminés et qui n'a pas encore de gel. Idempotente.
CREATE OR REPLACE FUNCTION public.geler_releves_fin_acces()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; _fin date; _contenu jsonb; _n integer := 0; _today date := (now() AT TIME ZONE 'Europe/Paris')::date;
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
      INSERT INTO public.releve_jalons_fin_acces (apprenant_id, version, fin_acces, nature, historique_prouve, contenu, sources)
      VALUES (a.id, 1, _fin,
        CASE WHEN _fin >= _today - 1 THEN 'fin_acces' ELSE 'protection_apres_fin' END,
        _fin >= _today - 1, _contenu, public.releve_sources_apprenant(a.id));
      _n := _n + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details)
      VALUES ('gel_releve_echec', 'Gel du relevé non réalisé', 'Le gel automatique du relevé a échoué ; nouvel essai à la prochaine exécution.', 'apprenant ' || a.id::text || ' : ' || SQLSTATE);
    END;
  END LOOP;
  RETURN _n;
END $$;

-- Exception unique : ajout ADMIN d'heures de PRATIQUE après le gel => nouvelle version (contenu figé repris), ancienne conservée.
CREATE OR REPLACE FUNCTION public.releve_ajout_pratique_apres_gel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d public.releve_jalons_fin_acces;
BEGIN
  IF NEW.categorie IS DISTINCT FROM 'pratique' OR NEW.date_presence IS NULL OR length(btrim(coalesce(NEW.motif,''))) < 3 THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('releve_fin_acces:' || NEW.apprenant_id::text));
  SELECT * INTO _d FROM public.releve_jalons_fin_acces WHERE apprenant_id = NEW.apprenant_id ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_d.sources->'heures_validees') e WHERE e->>'id' = NEW.id::text) THEN RETURN NEW; END IF;
  INSERT INTO public.releve_jalons_fin_acces (apprenant_id, version, fin_acces, nature, historique_prouve, contenu, sources, heures_validee_id, remplace_id, cree_par)
  VALUES (NEW.apprenant_id, _d.version + 1, _d.fin_acces, 'ajout_pratique_admin', _d.historique_prouve, _d.contenu,
    jsonb_set(_d.sources, '{heures_validees}', coalesce(_d.sources->'heures_validees','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', NEW.id, 'heures', NEW.heures, 'created_at', NEW.created_at, 'date_presence', NEW.date_presence, 'categorie', NEW.categorie, 'motif', NEW.motif))),
    NEW.id, _d.id, auth.uid())
  ON CONFLICT (heures_validee_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_releve_ajout_pratique_apres_gel AFTER INSERT ON public.presentiel_heures_validees
  FOR EACH ROW EXECUTE FUNCTION public.releve_ajout_pratique_apres_gel();

REVOKE ALL ON FUNCTION public.geler_releves_fin_acces() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.releve_figer_contenu() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.releve_sources_apprenant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fin_acces_elearning(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_acces_elearning(uuid) TO authenticated;