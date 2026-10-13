ALTER TABLE public.releve_jalons_fin_acces ADD COLUMN IF NOT EXISTS methode_version text NOT NULL DEFAULT 'gel-v1';
ALTER TABLE public.releve_jalons_fin_acces ADD COLUMN IF NOT EXISTS modules_modifies_apres_fin integer;
COMMENT ON COLUMN public.releve_jalons_fin_acces.modules_modifies_apres_fin IS 'Nombre de modules dont le contenu a changé entre la fin des accès (fin de journée Paris) et le gel ; >0 => historique non prouvé. NULL = inconnu.';

CREATE OR REPLACE FUNCTION public.releve_sources_apprenant(_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT jsonb_build_object(
    'completions', coalesce((SELECT jsonb_agg(jsonb_build_object('module_id', module_id, 'status', status, 'progress', progress, 'completed_at', completed_at) ORDER BY module_id) FROM public.apprenant_module_completion WHERE apprenant_id = _id), '[]'::jsonb),
    'emargements', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'date_emargement', date_emargement, 'demi_journee', demi_journee, 'absent', absent, 'masque', masque, 'signed_at', signed_at,
        'signature_data_url', CASE WHEN btrim(coalesce(signature_data_url,'')) <> '' THEN 'signee' END) ORDER BY date_emargement, demi_journee, id) FROM public.emargements_fc WHERE apprenant_id = _id), '[]'::jsonb),
    'heures_validees', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'heures', heures, 'created_at', created_at, 'date_presence', date_presence, 'categorie', categorie, 'motif', motif) ORDER BY created_at) FROM public.presentiel_heures_validees WHERE apprenant_id = _id), '[]'::jsonb),
    'reservations_pratique', coalesce((SELECT jsonb_agg(jsonb_build_object('date_choisie', date_choisie, 'type_formation', type_formation, 'creneau', creneau) ORDER BY date_choisie) FROM public.reservations_pratique WHERE apprenant_id = _id), '[]'::jsonb),
    'sessions', coalesce((SELECT jsonb_agg(jsonb_build_object('heure_debut_personnalisee', sa.heure_debut_personnalisee, 'heure_fin_personnalisee', sa.heure_fin_personnalisee,
        'sessions', jsonb_build_object('type_session', s.type_session, 'nom', s.nom, 'date_debut', s.date_debut, 'date_fin', s.date_fin, 'heure_debut', s.heure_debut, 'heure_fin', s.heure_fin, 'statut', s.statut)) ORDER BY s.date_debut)
        FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id WHERE sa.apprenant_id = _id), '[]'::jsonb),
    'planning_configs', coalesce((SELECT jsonb_agg(jsonb_build_object('planning_start_date', c.planning_start_date, 'planning_end_date', c.planning_end_date, 'day_time_slots', c.day_time_slots, 'updated_at', c.updated_at) ORDER BY c.updated_at DESC)
        FROM public.planning_pratique_config c WHERE EXISTS (SELECT 1 FROM public.reservations_pratique r WHERE r.apprenant_id = _id AND r.date_choisie BETWEEN c.planning_start_date AND c.planning_end_date)
           OR EXISTS (SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id WHERE sa.apprenant_id = _id AND s.date_debut BETWEEN c.planning_start_date AND c.planning_end_date)), '[]'::jsonb),
    'activites', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'module_id', module_id, 'module_nom', module_nom, 'action_type', action_type, 'occurred_at', occurred_at) ORDER BY occurred_at, id) FROM public.apprenant_module_activites WHERE apprenant_id = _id), '[]'::jsonb),
    'reponses', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'exercice_id', exercice_id, 'reponses', reponses, 'completed', completed, 'status', status, 'tentative', tentative, 'submitted_at', submitted_at, 'updated_at', updated_at) ORDER BY id) FROM public.reponses_apprenants WHERE apprenant_id = _id), '[]'::jsonb),
    'quiz', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'quiz_type', quiz_type, 'quiz_id', quiz_id, 'matiere_id', matiere_id, 'note_sur_20', note_sur_20, 'completed_at', completed_at) ORDER BY id) FROM public.apprenant_quiz_results WHERE apprenant_id = _id), '[]'::jsonb),
    'tentatives_v2', coalesce((SELECT jsonb_agg(jsonb_build_object('attempt_id', attempt_id, 'exam_id', exam_id, 'etat', etat, 'is_test', is_test, 'started_at', started_at, 'finished_at', finished_at, 'snapshot_fingerprint', snapshot_fingerprint) ORDER BY attempt_id) FROM public.exam_attempts_v2 WHERE apprenant_id = _id), '[]'::jsonb),
    'connexions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'started_at', started_at, 'ended_at', ended_at, 'last_seen_at', last_seen_at, 'last_action_at', last_action_at) ORDER BY id) FROM public.apprenant_connexions WHERE apprenant_id = _id), '[]'::jsonb),
    'gele_le', now()
  )
$function$;

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
      -- Contenu modifié entre la fin de la journée d'expiration (Paris) et le gel => historique NON prouvé.
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
  RETURN NEW;
END $function$;