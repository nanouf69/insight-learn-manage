-- CANDIDAT PROSPECTIF — ne pas appliquer sans revue et autorisation explicites.
-- Aucune revalidation/backfill des anciens statuts et aucun recalcul des relevés existants.
-- Test obligatoire : MODULE_COMPLETION_CANDIDATE=docs/candidates/module_completion_preuves_versionnees.sql python3 src/test/module_completion_sql_contract.py

CREATE TABLE public.module_completion_validations (
  apprenant_id uuid NOT NULL REFERENCES public.apprenants(id),
  module_id integer NOT NULL,
  methode text NOT NULL,
  perimetre jsonb NOT NULL,
  questions_requises integer NOT NULL CHECK (questions_requises >= 0),
  questions_prouvees integer NOT NULL CHECK (questions_prouvees >= 0),
  preuve_complete boolean,
  valide_le timestamptz NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (apprenant_id, module_id)
);
GRANT SELECT ON public.module_completion_validations TO authenticated;
GRANT ALL ON public.module_completion_validations TO service_role;
ALTER TABLE public.module_completion_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Propriétaire et admin lisent les preuves de validation"
ON public.module_completion_validations FOR SELECT TO authenticated
USING (public.est_proprietaire_apprenant(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.module_completion_validation_immuable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'PREUVE_VALIDATION_IMMUTABLE: historique append-only' USING ERRCODE = 'P0502';
END $$;
CREATE TRIGGER trg_module_completion_validation_immuable
BEFORE UPDATE OR DELETE ON public.module_completion_validations
FOR EACH ROW EXECUTE FUNCTION public.module_completion_validation_immuable();

-- Le canon serveur complète les exercices omis et impose la nature QCM/QRC.
-- Les activités définies seulement dans le code restent couvertes par les details serveur.
CREATE OR REPLACE FUNCTION public.module_completion_analyse_preuves(
  _apprenant_id uuid, _module_id integer, _details jsonb
) RETURNS TABLE(
  questions_requises integer, questions_prouvees integer, questions_manquantes integer,
  activite_prouvee boolean, perimetre jsonb
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $f$
  WITH s AS (
    SELECT (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int AS m,
           (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[2]::text AS ex,
           r.reponses, r.submitted_at
      FROM public.reponses_apprenants r
     WHERE r.apprenant_id = _apprenant_id AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
       AND jsonb_typeof(r.reponses) = 'object' AND r.exercice_id ~ '^module_\d+_exo_\d+$'
  ), d0 AS (
    SELECT d.value->>'exerciceId' AS ex, d.value->>'questionId' AS qid,
           public.reponse_enregistree(d.value->'reponseEleve') AS rep,
           NOT (jsonb_typeof(d.value->'reponseCorrecte') = 'array'
                AND jsonb_array_length(d.value->'reponseCorrecte') = 0) AS obligatoire
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_details) = 'array' THEN _details ELSE '[]'::jsonb END) d(value)
     WHERE jsonb_typeof(d.value) = 'object' AND d.value->>'exerciceId' IS NOT NULL AND d.value->>'questionId' IS NOT NULL
  ), d AS (
    SELECT DISTINCT ON (ex, qid) ex, qid, rep, obligatoire FROM d0 ORDER BY ex, qid, rep DESC
  ), c AS (
    SELECT e.value->>'id' AS ex, q.value->>'id' AS qid,
           NOT (
             lower(coalesce(q.value->>'type', '')) = 'qrc'
             OR (jsonb_typeof(q.value->'choix') = 'array' AND jsonb_array_length(q.value->'choix') = 0)
             OR (q.value->'choix' IS NULL AND (
               btrim(coalesce(q.value->>'reponseQRC', '')) <> ''
               OR (jsonb_typeof(q.value->'reponsesAttendues') = 'array' AND jsonb_array_length(q.value->'reponsesAttendues') > 0)
             ))
           ) AS obligatoire
      FROM public.module_editor_state m
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e(value)
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(e.value->'questions') = 'array' THEN e.value->'questions' ELSE '[]'::jsonb END) q(value)
     WHERE m.module_id = _module_id
       AND coalesce((e.value->>'actif')::boolean, true)
       AND coalesce((q.value->>'actif')::boolean, true)
       AND coalesce((q.value->>'masque')::boolean, false) IS FALSE
       AND coalesce((q.value->>'suppressed')::boolean, false) IS FALSE
       AND q.value->>'id' IS NOT NULL AND e.value->>'id' IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(e.value->'deletedQuestionIds') = 'array' THEN e.value->'deletedQuestionIds' ELSE '[]'::jsonb END) dq(value)
         WHERE dq.value::text = q.value->>'id'
       )
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'questions_masquees_bilan') = 'array' THEN m.module_data->'questions_masquees_bilan' ELSE '[]'::jsonb END) mm(value)
         WHERE (mm.value->'question'->>'uid' IS NOT NULL AND mm.value->'question'->>'uid' = q.value->>'uid')
            OR ((mm.value->>'exercice_id') = e.value->>'id' AND (mm.value->'question'->>'id') = q.value->>'id')
       )
  ), k0 AS (
    SELECT coalesce(c.ex, d.ex) AS ex, coalesce(c.qid, d.qid) AS qid,
           coalesce(c.obligatoire, d.obligatoire, true) AS obligatoire,
           coalesce(d.rep, false) AS rep
      FROM c FULL JOIN d ON d.ex = c.ex AND d.qid = c.qid
  ), q AS (
    SELECT DISTINCT ON (k0.ex, k0.qid) k0.ex, k0.qid, k0.rep
      FROM k0
      LEFT JOIN LATERAL (
        SELECT max(l.created_at) FILTER (WHERE l.field = 'question_added') AS ajout,
               max(l.created_at) FILTER (WHERE l.field = 'question_deleted') AS supp
          FROM public.module_admin_audit_log l
         WHERE l.module_id = _module_id AND l.exercice_id = k0.ex AND l.question_id = k0.qid
           AND l.field IN ('question_added', 'question_deleted')
      ) h ON true
      LEFT JOIN LATERAL (SELECT min(s.submitted_at) AS soumis FROM s WHERE s.m = _module_id AND s.ex = k0.ex) p ON true
     WHERE k0.obligatoire
       AND NOT (h.supp IS NOT NULL AND (h.ajout IS NULL OR h.supp > h.ajout))
       AND NOT (h.ajout IS NOT NULL AND p.soumis IS NOT NULL AND h.ajout > p.soumis)
     ORDER BY k0.ex, k0.qid, k0.rep DESC
  ), couverts AS (
    SELECT DISTINCT s.ex FROM s
     WHERE s.m = _module_id
       AND EXISTS (SELECT 1 FROM q WHERE q.ex = s.ex)
       AND NOT EXISTS (
         SELECT 1 FROM q WHERE q.ex = s.ex
          AND NOT public.reponse_enregistree(s.reponses -> (s.ex || '-' || q.qid))
       )
  ), agg AS (
    SELECT count(q.qid)::int AS req,
           count(q.qid) FILTER (WHERE q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.ex = q.ex))::int AS prv,
           coalesce(jsonb_agg(jsonb_build_object(
             'exerciceId', q.ex, 'questionId', q.qid,
             'prouve', q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.ex = q.ex)
           ) ORDER BY q.ex, q.qid) FILTER (WHERE q.qid IS NOT NULL), '[]'::jsonb) AS perimetre
      FROM q
  ), activite AS (
    SELECT (
      EXISTS (SELECT 1 FROM d0 WHERE d0.rep)
      OR EXISTS (
        SELECT 1 FROM public.reponses_apprenants r, jsonb_each(coalesce(r.reponses, '{}'::jsonb)) x
         WHERE r.apprenant_id = _apprenant_id
           AND r.exercice_id LIKE 'module\_' || _module_id::text || '\_exo\_%' ESCAPE '\'
           AND public.reponse_enregistree(x.value)
      )
    ) AS ok
  )
  SELECT agg.req, agg.prv, agg.req - agg.prv, activite.ok, agg.perimetre FROM agg CROSS JOIN activite
$f$;
REVOKE ALL ON FUNCTION public.module_completion_analyse_preuves(uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.module_completion_analyse_preuves(uuid, integer, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.save_module_completion(
  _apprenant_id uuid, _module_id integer, _completed boolean DEFAULT false,
  _progress integer DEFAULT 0, _score_obtenu integer DEFAULT NULL::integer,
  _score_max integer DEFAULT NULL::integer, _details jsonb DEFAULT NULL::jsonb
) RETURNS apprenant_module_completion
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  allowed boolean;
  result public.apprenant_module_completion;
  v_row public.apprenant_module_completion;
  v_details jsonb;
  v_nb_questions bigint := 0;
  v_req integer := 0;
  v_prv integer := 0;
  v_manquantes integer := 0;
  v_activite boolean := false;
  v_perimetre jsonb := '[]'::jsonb;
  v_facultatif boolean := false;
  v_preuve_complete boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR current_setting('role', true) = 'service_role'
    INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'not authorized for this apprenant'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('module-completion:' || _apprenant_id::text || ':' || _module_id::text, 0));
  SELECT * INTO v_row FROM public.apprenant_module_completion
   WHERE apprenant_id = _apprenant_id AND module_id = _module_id FOR UPDATE;

  -- Rejeu/progression tardive : preuve initiale, date et scores intacts.
  IF v_row.id IS NOT NULL AND (v_row.status = 'completed' OR (v_row.status IS NULL AND v_row.completed_at IS NOT NULL)) THEN
    RETURN v_row;
  END IF;

  IF _completed THEN
    v_details := CASE
      WHEN jsonb_typeof(_details) = 'array' AND jsonb_array_length(_details) > 0 THEN _details
      ELSE coalesce(v_row.details, '[]'::jsonb)
    END;
    SELECT a.questions_requises, a.questions_prouvees, a.questions_manquantes, a.activite_prouvee, a.perimetre
      INTO v_req, v_prv, v_manquantes, v_activite, v_perimetre
      FROM public.module_completion_analyse_preuves(_apprenant_id, _module_id, v_details) a;

    SELECT coalesce(sum(CASE WHEN jsonb_typeof(e.value->'questions') = 'array' THEN jsonb_array_length(e.value->'questions') ELSE 0 END), 0)
      INTO v_nb_questions
      FROM public.module_editor_state m,
           jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e(value)
     WHERE m.module_id = _module_id;
    IF v_nb_questions = 0 AND jsonb_typeof(v_details) = 'array' THEN
      SELECT count(*) INTO v_nb_questions FROM jsonb_array_elements(v_details) d(value)
       WHERE jsonb_typeof(d.value) = 'object' AND d.value->>'exerciceId' IS NOT NULL AND d.value->>'questionId' IS NOT NULL;
    END IF;
    IF v_nb_questions = 0 AND EXISTS (
      SELECT 1 FROM public.module_regles_validation r
       WHERE r.module_id = _module_id AND r.protection_serveur AND r.contient_questions IS TRUE
    ) THEN v_nb_questions := 1; END IF;

    v_facultatif := EXISTS (
      SELECT 1 FROM public.module_regles_validation r
       WHERE r.module_id = _module_id AND r.contient_questions IS TRUE AND r.protection_serveur IS FALSE
    );
    IF v_nb_questions > 0 AND NOT v_activite THEN
      RAISE EXCEPTION 'MODULE_INCOMPLET: aucune réponse enregistrée pour ce module' USING ERRCODE = 'P0501';
    END IF;
    IF _module_id NOT BETWEEN 35 AND 38 AND NOT v_facultatif AND v_manquantes > 0 THEN
      RAISE EXCEPTION 'MODULE_INCOMPLET: % question(s) QCM sans réponse enregistrée', v_manquantes USING ERRCODE = 'P0501';
    END IF;
    v_preuve_complete := CASE
      WHEN _module_id BETWEEN 35 AND 38 THEN true
      WHEN v_req = 0 THEN NULL
      ELSE v_manquantes = 0
    END;
  END IF;

  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, score_obtenu, score_max, details)
  VALUES (
    _apprenant_id, _module_id,
    CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN _completed THEN 100 ELSE greatest(coalesce(_progress, 0), 0) END,
    CASE WHEN _completed THEN now() ELSE NULL END,
    _score_obtenu, _score_max, coalesce(_details, '[]'::jsonb)
  )
  ON CONFLICT (apprenant_id, module_id) DO UPDATE SET
    status = CASE WHEN amc.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
    progress = greatest(coalesce(amc.progress, 0), coalesce(_progress, 0), CASE WHEN _completed THEN 100 ELSE 0 END),
    completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at WHEN _completed THEN now() ELSE amc.completed_at END,
    score_obtenu = coalesce(_score_obtenu, amc.score_obtenu),
    score_max = coalesce(_score_max, amc.score_max),
    details = CASE
      WHEN _details IS NULL THEN amc.details
      WHEN jsonb_array_length(coalesce(_details, '[]'::jsonb)) = 0 THEN amc.details
      WHEN amc.status IS DISTINCT FROM 'completed' AND NOT _completed THEN public.fusion_details_progression(amc.details, _details)
      ELSE _details
    END
  RETURNING * INTO result;

  IF _completed THEN
    INSERT INTO public.module_completion_validations (
      apprenant_id, module_id, methode, perimetre, questions_requises,
      questions_prouvees, preuve_complete, valide_le
    ) VALUES (
      _apprenant_id, _module_id, 'module-completion-preuves-v1', v_perimetre,
      v_req, v_prv, v_preuve_complete, result.completed_at
    ) ON CONFLICT (apprenant_id, module_id) DO NOTHING;
  END IF;
  RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.save_module_completion(uuid, integer, boolean, integer, integer, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_module_completion(uuid, integer, boolean, integer, integer, integer, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.autovalidate_module_if_complete(
  _apprenant_id uuid, _module_id integer, _total_questions integer
) RETURNS TABLE(answered integer, total integer, validated boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  allowed boolean;
  v_row public.apprenant_module_completion;
  v_saved public.apprenant_module_completion;
  v_req integer;
  v_prv integer;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR current_setting('role', true) = 'service_role'
    INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'not authorized for this apprenant'; END IF;
  IF _apprenant_id IS NULL OR _module_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, false; RETURN;
  END IF;

  SELECT * INTO v_row FROM public.apprenant_module_completion
   WHERE apprenant_id = _apprenant_id AND module_id = _module_id;
  SELECT a.questions_requises, a.questions_prouvees INTO v_req, v_prv
    FROM public.module_completion_analyse_preuves(_apprenant_id, _module_id, coalesce(v_row.details, '[]'::jsonb)) a;

  BEGIN
    v_saved := public.save_module_completion(
      _apprenant_id, _module_id, true, 100,
      v_row.score_obtenu, v_row.score_max, v_row.details
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'P0501' THEN
      RETURN QUERY SELECT coalesce(v_prv, 0), coalesce(v_req, 0), false; RETURN;
    END IF;
    RAISE;
  END;
  RETURN QUERY SELECT coalesce(v_prv, 0), coalesce(v_req, 0), true;
END $function$;
REVOKE ALL ON FUNCTION public.autovalidate_module_if_complete(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete(uuid, integer, integer) TO authenticated, service_role;

-- Nouvelles preuves = snapshot figé ; anciennes lignes = algorithme historique inchangé.
CREATE OR REPLACE FUNCTION public.etat_completion_modules(_apprenant_id uuid)
RETURNS TABLE(module_id integer, status text, completed_at timestamptz, progress numeric,
  questions_requises integer, questions_prouvees integer, preuve_complete boolean,
  status_effectif text, progress_effectif numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $f$
  WITH c AS (
    SELECT amc.module_id, amc.status, amc.completed_at, amc.progress::numeric AS progress, amc.details
      FROM public.apprenant_module_completion amc WHERE amc.apprenant_id = _apprenant_id
  ), s AS (
    SELECT (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int AS m,
           (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[2]::text AS ex, r.reponses, r.submitted_at
      FROM public.reponses_apprenants r
     WHERE r.apprenant_id = _apprenant_id AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
       AND jsonb_typeof(r.reponses) = 'object' AND r.exercice_id ~ '^module_\d+_exo_\d+$'
  ), q0 AS (
    SELECT c.module_id, c.status AS mstatus, c.completed_at AS mdone,
           d.value->>'exerciceId' AS ex, d.value->>'questionId' AS qid,
           public.reponse_enregistree(d.value->'reponseEleve') AS rep
      FROM c, jsonb_array_elements(CASE WHEN jsonb_typeof(c.details) = 'array' THEN c.details ELSE '[]'::jsonb END) d(value)
     WHERE jsonb_typeof(d.value) = 'object' AND d.value->>'exerciceId' IS NOT NULL AND d.value->>'questionId' IS NOT NULL
       AND NOT (jsonb_typeof(d.value->'reponseCorrecte') = 'array' AND jsonb_array_length(d.value->'reponseCorrecte') = 0)
  ), q AS (
    SELECT DISTINCT ON (q0.module_id, q0.ex, q0.qid) q0.module_id, q0.ex, q0.qid, q0.rep
      FROM q0
      LEFT JOIN LATERAL (
        SELECT max(l.created_at) FILTER (WHERE l.field = 'question_added') AS ajout,
               max(l.created_at) FILTER (WHERE l.field = 'question_deleted') AS supp
          FROM public.module_admin_audit_log l
         WHERE l.module_id = q0.module_id AND l.exercice_id = q0.ex AND l.question_id = q0.qid
           AND l.field IN ('question_added', 'question_deleted')
      ) h ON true
      LEFT JOIN LATERAL (SELECT min(s.submitted_at) AS soumis FROM s WHERE s.m = q0.module_id AND s.ex = q0.ex) p ON true
     WHERE NOT (h.supp IS NOT NULL AND (h.ajout IS NULL OR h.supp > h.ajout))
       AND NOT (h.ajout IS NOT NULL AND h.ajout > LEAST(CASE WHEN q0.mstatus = 'completed' THEN q0.mdone END, p.soumis))
     ORDER BY q0.module_id, q0.ex, q0.qid, q0.rep DESC
  ), couverts AS (
    SELECT DISTINCT s.m, s.ex FROM s
     WHERE EXISTS (SELECT 1 FROM q WHERE q.module_id = s.m AND q.ex = s.ex)
       AND NOT EXISTS (
         SELECT 1 FROM q WHERE q.module_id = s.m AND q.ex = s.ex
          AND NOT public.reponse_enregistree(s.reponses -> (s.ex || '-' || q.qid))
       )
  ), agg AS (
    SELECT q.module_id, count(*)::int AS req,
           count(*) FILTER (WHERE q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.m = q.module_id AND k.ex = q.ex))::int AS prv
      FROM q GROUP BY q.module_id
  ), e AS (
    SELECT c.module_id, c.status, c.completed_at, c.progress,
           CASE WHEN v.apprenant_id IS NOT NULL THEN v.questions_requises ELSE coalesce(a.req, 0) END AS req,
           CASE WHEN v.apprenant_id IS NOT NULL THEN v.questions_prouvees ELSE coalesce(a.prv, 0) END AS prv,
           CASE
             WHEN v.apprenant_id IS NOT NULL THEN v.preuve_complete
             WHEN c.module_id BETWEEN 35 AND 38 THEN true
             WHEN coalesce(a.req, 0) = 0 THEN NULL
             ELSE a.prv = a.req
           END AS preuve
      FROM c
      LEFT JOIN agg a ON a.module_id = c.module_id
      LEFT JOIN public.module_completion_validations v ON v.apprenant_id = _apprenant_id AND v.module_id = c.module_id
  )
  SELECT e.module_id, e.status, e.completed_at, e.progress, e.req, e.prv, e.preuve,
         CASE WHEN e.preuve IS FALSE THEN 'in_progress' ELSE e.status END,
         CASE WHEN e.preuve IS FALSE THEN least(99.9, coalesce(e.progress, 100), e.prv::numeric * 100 / e.req)
              ELSE e.progress END
    FROM e ORDER BY e.module_id
$f$;
REVOKE ALL ON FUNCTION public.etat_completion_modules(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.etat_completion_modules(uuid) TO authenticated, service_role;

-- Seuls les NOUVEAUX gels portent gel-v3 : verdicts et attribution figés à la création.
CREATE OR REPLACE FUNCTION public.releve_sources_apprenant(_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
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
    'preuves_completion', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.module_id) FROM public.etat_completion_modules(_id) x), '[]'::jsonb),
    'modules_attribues', coalesce((SELECT to_jsonb(a.modules_autorises) FROM public.apprenants a WHERE a.id = _id), '[]'::jsonb),
    'gele_le', now()
  )
$function$;
REVOKE ALL ON FUNCTION public.releve_sources_apprenant(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.releve_sources_apprenant(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.geler_releves_fin_acces()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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
        _fin >= _today - 1 AND _modifs = 0, _contenu, public.releve_sources_apprenant(a.id), 'gel-v3', _modifs);
      _n := _n + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details)
      VALUES ('gel_releve_echec', 'Gel du relevé non réalisé', 'Le gel automatique du relevé a échoué ; nouvel essai à la prochaine exécution horaire.', 'apprenant ' || a.id::text || ' : ' || SQLSTATE);
    END;
  END LOOP;
  RETURN _n;
END $function$;
REVOKE ALL ON FUNCTION public.geler_releves_fin_acces() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geler_releves_fin_acces() TO service_role;
