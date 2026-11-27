-- 0304 — Validation admin journalisée d'un module dont le relevé ancien ne correspond plus
-- aux identifiants permanents des questions (cas Mohamed HAMID ARGA, module 4).
-- Additif : aucune réponse, tentative, note, score ni ligne apprenant_module_completion modifiée.
-- La règle stricte de etat_completion_modules reste identique pour toute ligne sans validation admin.

CREATE TABLE public.module_completion_validations_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  motif text NOT NULL,
  preuves jsonb NOT NULL,
  auteur_uid uuid,
  auteur_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_completion_validations_admin_unique UNIQUE (apprenant_id, module_id)
);
COMMENT ON TABLE public.module_completion_validations_admin IS
  'Append-only : décision admin individuelle reconnaissant un module dont les tentatives soumises existent mais dont le relevé ancien utilise d''anciens identifiants de questions. Ne remplace aucune preuve, ne modifie aucune réponse.';

GRANT SELECT ON public.module_completion_validations_admin TO authenticated;
GRANT ALL ON public.module_completion_validations_admin TO service_role;
ALTER TABLE public.module_completion_validations_admin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins et apprenant concerné lisent la validation"
  ON public.module_completion_validations_admin FOR SELECT TO authenticated
  USING ((select public.has_role((select auth.uid()), 'admin')) OR public.est_proprietaire_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.module_completion_validations_admin_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'module_completion_validations_admin est en ajout seul' USING ERRCODE = 'P0554';
END $$;
CREATE TRIGGER trg_module_completion_validations_admin_append_only
  BEFORE UPDATE OR DELETE ON public.module_completion_validations_admin
  FOR EACH ROW EXECUTE FUNCTION public.module_completion_validations_admin_append_only();

-- Verdict serveur : identique à la version précédente, plus une seule exception —
-- une validation admin dont CHAQUE tentative enregistrée existe encore à l'identique
-- (même exercice, statut submitted, même date de remise, même empreinte des réponses).
CREATE OR REPLACE FUNCTION public.etat_completion_modules(_apprenant_id uuid)
 RETURNS TABLE(module_id integer, status text, completed_at timestamp with time zone, progress numeric, questions_requises integer, questions_prouvees integer, preuve_complete boolean, status_effectif text, progress_effectif numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH h_obligations AS MATERIALIZED (
    SELECT * FROM public.historique_obligations_modules(_apprenant_id)
  ), h_non_datees AS MATERIALIZED (
    SELECT * FROM public.obligations_non_datees_anterieures(_apprenant_id)
  ), c AS (
    SELECT amc.module_id, amc.status, amc.completed_at, amc.progress::numeric AS progress, amc.details
      FROM public.apprenant_module_completion amc
     WHERE amc.apprenant_id = _apprenant_id
  ), s AS (
    SELECT (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int AS m,
           (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[2] AS ex, r.reponses, r.submitted_at
      FROM public.reponses_apprenants r
     WHERE r.apprenant_id = _apprenant_id AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
       AND jsonb_typeof(r.reponses) = 'object' AND r.exercice_id ~ '^module_\d+_exo_\d+$'
  ), q0 AS (
    SELECT c.module_id, c.status AS mstatus, c.completed_at AS mdone,
           d->>'exerciceId' AS ex, d->>'questionId' AS qid,
           public.reponse_enregistree(d->'reponseEleve') AS rep
      FROM c, jsonb_array_elements(CASE WHEN jsonb_typeof(c.details) = 'array' THEN c.details ELSE '[]'::jsonb END) d
     WHERE jsonb_typeof(d) = 'object' AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
       AND NOT (jsonb_typeof(d->'reponseCorrecte') = 'array' AND jsonb_array_length(d->'reponseCorrecte') = 0)
  ), q_lyon AS (
    SELECT c.module_id, c.status AS mstatus, c.completed_at AS mdone,
      '1785332774763'::text AS ex, q::text AS qid,
      public.reponse_enregistree((SELECT reponses FROM public.reponses_apprenants
        WHERE apprenant_id=_apprenant_id AND exercice_id='module_8_exo_1785332774763' LIMIT 1)
        -> ('1785332774763-'||q)) AS rep
    FROM c CROSS JOIN generate_series(1,138) q
    WHERE c.module_id=8 AND EXISTS (SELECT 1 FROM public.quiz_lyon_cohortes WHERE apprenant_id=_apprenant_id)
  ), q_base AS (
    SELECT * FROM q0 WHERE NOT (q0.module_id=8 AND q0.ex='1785332774763'
      AND EXISTS (SELECT 1 FROM public.quiz_lyon_cohortes WHERE apprenant_id=_apprenant_id))
    UNION ALL SELECT * FROM q_lyon
  ), q AS (
    SELECT DISTINCT ON (q0.module_id, q0.ex, q0.qid) q0.module_id, q0.ex, q0.qid, q0.rep
      FROM q_base q0
      LEFT JOIN h_obligations h ON h.module_id = q0.module_id
        AND h.exercice_id = q0.ex AND h.question_id = q0.qid
      LEFT JOIN LATERAL (
        SELECT min(s.submitted_at) AS soumis FROM s WHERE s.m = q0.module_id AND s.ex = q0.ex
      ) p ON true
     WHERE NOT (h.supp IS NOT NULL AND (h.ajout IS NULL OR h.supp > h.ajout))
       AND NOT EXISTS (SELECT 1 FROM h_non_datees nd WHERE nd.module_id = q0.module_id
             AND nd.exercice_id = q0.ex AND nd.question_id = q0.qid)
       AND NOT (h.ajout IS NOT NULL AND h.ajout > LEAST(
             CASE WHEN q0.mstatus = 'completed' THEN q0.mdone END, p.soumis))
     ORDER BY q0.module_id, q0.ex, q0.qid, q0.rep DESC
  ), couverts AS (
    SELECT DISTINCT s.m, s.ex FROM s
     WHERE EXISTS (SELECT 1 FROM q WHERE q.module_id = s.m AND q.ex = s.ex)
       AND NOT EXISTS (SELECT 1 FROM q WHERE q.module_id = s.m AND q.ex = s.ex
                        AND NOT public.reponse_enregistree(s.reponses -> (s.ex || '-' || q.qid)))
  ), agg AS (
    SELECT q.module_id, count(*)::int AS req,
           count(*) FILTER (WHERE q.rep OR EXISTS (SELECT 1 FROM couverts k WHERE k.m = q.module_id AND k.ex = q.ex))::int AS prv
      FROM q GROUP BY q.module_id
  ), v_admin AS (
    SELECT va.module_id
      FROM public.module_completion_validations_admin va
     WHERE va.apprenant_id = _apprenant_id
       AND jsonb_typeof(va.preuves) = 'array' AND jsonb_array_length(va.preuves) > 0
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(va.preuves) p
          WHERE NOT EXISTS (
            SELECT 1 FROM public.reponses_apprenants r
             WHERE r.apprenant_id = _apprenant_id
               AND r.exercice_id = p->>'exercice_id'
               AND r.status = 'submitted'
               AND r.submitted_at = (p->>'submitted_at')::timestamptz
               AND md5(r.reponses::text) = p->>'empreinte'))
  ), e AS (
    SELECT c.module_id, c.status, c.completed_at, c.progress,
           COALESCE(a.req, 0) AS req, COALESCE(a.prv, 0) AS prv,
           CASE
             WHEN c.module_id BETWEEN 35 AND 38 THEN true
             WHEN c.status = 'completed' AND EXISTS (SELECT 1 FROM v_admin v WHERE v.module_id = c.module_id) THEN true
             WHEN COALESCE(a.req, 0) = 0 THEN NULL
             ELSE a.prv = a.req
           END AS preuve
      FROM c LEFT JOIN agg a ON a.module_id = c.module_id
  )
  SELECT e.module_id, e.status, e.completed_at, e.progress, e.req, e.prv, e.preuve,
         CASE WHEN e.preuve IS FALSE THEN 'in_progress' ELSE e.status END,
         CASE WHEN e.preuve IS FALSE
              THEN LEAST(99.9, COALESCE(e.progress, 100), e.prv::numeric * 100 / e.req)
              ELSE e.progress END
    FROM e ORDER BY e.module_id
$function$;

-- Seule voie d'écriture : un admin (ou service_role), un apprenant, un module, un motif.
CREATE OR REPLACE FUNCTION public.admin_valider_module_preuve_legacy(_apprenant_id uuid, _module_id integer, _motif text)
RETURNS public.module_completion_validations_admin
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin boolean := COALESCE(public.has_role(auth.uid(), 'admin'), false);
  v_service boolean := current_setting('role', true) = 'service_role';
  v_status text; v_details jsonb; v_preuve boolean;
  v_requis text[]; v_manquants text[]; v_preuves jsonb;
  v_row public.module_completion_validations_admin;
BEGIN
  IF NOT (v_admin OR v_service) THEN
    RAISE EXCEPTION 'Validation réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF _motif IS NULL OR length(btrim(_motif)) < 20 THEN
    RAISE EXCEPTION 'Motif d''au moins 20 caractères obligatoire' USING ERRCODE = 'P0550';
  END IF;
  IF _module_id BETWEEN 35 AND 38 THEN
    RAISE EXCEPTION 'Examens blancs exclus de cette validation' USING ERRCODE = 'P0551';
  END IF;
  SELECT amc.status, amc.details INTO v_status, v_details
    FROM public.apprenant_module_completion amc
   WHERE amc.apprenant_id = _apprenant_id AND amc.module_id = _module_id;
  IF v_status IS DISTINCT FROM 'completed' OR jsonb_typeof(v_details) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_details) = 0 THEN
    RAISE EXCEPTION 'Aucun relevé de validation existant pour ce module' USING ERRCODE = 'P0551';
  END IF;
  SELECT x.preuve_complete INTO v_preuve FROM public.etat_completion_modules(_apprenant_id) x WHERE x.module_id = _module_id;
  IF v_preuve IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Le serveur ne signale pas de preuve manquante pour ce module' USING ERRCODE = 'P0552';
  END IF;

  -- Quiz requis = ceux du relevé ancien ∪ ceux actuellement actifs avec questions.
  SELECT array_agg(DISTINCT ex ORDER BY ex) INTO v_requis FROM (
    SELECT d->>'exerciceId' AS ex FROM jsonb_array_elements(v_details) d
     WHERE jsonb_typeof(d) = 'object' AND COALESCE(d->>'exerciceId', '') <> ''
    UNION
    SELECT e->>'id' FROM public.module_editor_state m,
           jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e
     WHERE m.module_id = _module_id AND COALESCE(e->>'actif', 'true') <> 'false'
       AND jsonb_typeof(e->'questions') = 'array' AND jsonb_array_length(e->'questions') > 0
       AND COALESCE(e->>'id', '') <> ''
  ) x;

  -- Chaque quiz : tentative d'origine soumise (jamais une révision ni un brouillon), non vide, sans réponse vide.
  SELECT array_agg(ex ORDER BY ex) INTO v_manquants FROM unnest(v_requis) ex
   WHERE NOT EXISTS (
     SELECT 1 FROM public.reponses_apprenants r
      WHERE r.apprenant_id = _apprenant_id AND r.exercice_id = 'module_' || _module_id || '_exo_' || ex
        AND r.status = 'submitted' AND r.submitted_at IS NOT NULL AND jsonb_typeof(r.reponses) = 'object'
        AND EXISTS (SELECT 1 FROM jsonb_each(r.reponses))
        AND NOT EXISTS (SELECT 1 FROM jsonb_each(r.reponses) y WHERE NOT public.reponse_enregistree(y.value)));
  IF v_requis IS NULL OR v_manquants IS NOT NULL THEN
    RAISE EXCEPTION 'Quiz sans remise complète confirmée : %', COALESCE(array_to_string(v_manquants, ', '), 'aucun quiz requis')
      USING ERRCODE = 'P0553';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
           'exercice_id', r.exercice_id,
           'submitted_at', to_jsonb(r.submitted_at),
           'nb_reponses', (SELECT count(*) FROM jsonb_each(r.reponses)),
           'empreinte', md5(r.reponses::text)) ORDER BY r.exercice_id)
    INTO v_preuves
    FROM public.reponses_apprenants r
   WHERE r.apprenant_id = _apprenant_id
     AND r.exercice_id = ANY (SELECT 'module_' || _module_id || '_exo_' || ex FROM unnest(v_requis) ex);

  INSERT INTO public.module_completion_validations_admin (apprenant_id, module_id, motif, preuves, auteur_uid, auteur_role)
  VALUES (_apprenant_id, _module_id, btrim(_motif), v_preuves, auth.uid(), CASE WHEN v_admin THEN 'admin' ELSE 'service_role' END)
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.admin_valider_module_preuve_legacy(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_valider_module_preuve_legacy(uuid, integer, text) TO authenticated, service_role;
