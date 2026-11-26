BEGIN;
-- Vérification CAS des trois définitions avant toute activation : refus si dérive du catalogue.
DO $$ BEGIN
 IF (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE oid='public.save_module_completion(uuid,integer,boolean,integer,integer,integer,jsonb)'::regprocedure) <> 'ead0f4fc2653347c45063c76673d12b2'
 OR (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE oid='public.autovalidate_module_if_complete(uuid,integer,integer)'::regprocedure) <> '4699b31d8104f754e30ea83fa2a20fad'
 OR (SELECT md5(pg_get_functiondef(oid)) FROM pg_proc WHERE oid='public.etat_completion_modules(uuid)'::regprocedure) <> '670e30d8acabed6f025594e5c088da53' THEN
 RAISE EXCEPTION 'Catalogue modifié : revoir le delta Lyon'; END IF;
END $$;
-- CANDIDAT UNIQUEMENT : aucune installation/écriture en production.
-- Aucun backfill : la cohorte est créée au premier vrai enregistrement de réponses.
CREATE TABLE public.quiz_lyon_cohortes (
  apprenant_id uuid PRIMARY KEY,
  seuil integer NOT NULL DEFAULT 138 CHECK (seuil = 138),
  cree_le timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_lyon_cohortes TO authenticated;
GRANT ALL ON public.quiz_lyon_cohortes TO service_role;
ALTER TABLE public.quiz_lyon_cohortes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_lyon_lecture ON public.quiz_lyon_cohortes FOR SELECT TO authenticated
 USING (public.est_proprietaire_apprenant(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.quiz_lyon_seuil(_apprenant_id uuid) RETURNS integer
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT (public.est_proprietaire_apprenant(_apprenant_id) OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role') THEN
   RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501';
 END IF;
 IF EXISTS (SELECT 1 FROM public.quiz_lyon_cohortes WHERE apprenant_id=_apprenant_id) THEN RETURN 138; END IF;
 IF EXISTS (SELECT 1 FROM public.reponses_apprenants WHERE apprenant_id=_apprenant_id
      AND exercice_id IN ('module_8_exo_1785332774763','module_8_revision_exo_1785332774763'))
 OR EXISTS (SELECT 1 FROM public.reponses_apprenants_historique WHERE apprenant_id=_apprenant_id
      AND exercice_id IN ('module_8_exo_1785332774763','module_8_revision_exo_1785332774763'))
 OR EXISTS (SELECT 1 FROM public.apprenant_module_completion WHERE apprenant_id=_apprenant_id AND module_id=8
      AND (status='completed' OR (status IS NULL AND completed_at IS NOT NULL)
           OR coalesce(details::text,'') LIKE '%1785332774763%')) THEN RETURN 99; END IF;
 RETURN 138;
END $$;
REVOKE ALL ON FUNCTION public.quiz_lyon_seuil(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quiz_lyon_seuil(uuid) TO authenticated, service_role;

CREATE FUNCTION public.quiz_lyon_reponses_completes(_apprenant_id uuid, _reponses jsonb DEFAULT NULL) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN public.quiz_lyon_seuil(_apprenant_id)=99 THEN true ELSE
 NOT EXISTS (SELECT 1 FROM generate_series(1,138) q WHERE NOT public.reponse_enregistree(
   coalesce(_reponses, (SELECT reponses FROM public.reponses_apprenants
     WHERE apprenant_id=_apprenant_id AND exercice_id='module_8_exo_1785332774763' LIMIT 1))
      -> ('1785332774763-'||q))) END
$$;
REVOKE ALL ON FUNCTION public.quiz_lyon_reponses_completes(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quiz_lyon_reponses_completes(uuid,jsonb) TO authenticated, service_role;

CREATE FUNCTION public.quiz_lyon_garde_reponses() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.exercice_id NOT IN ('module_8_exo_1785332774763','module_8_revision_exo_1785332774763') THEN RETURN NEW; END IF;
 -- Sérialisation inter-appareils sur la ligne propriétaire, sans modification.
 PERFORM 1 FROM public.apprenants WHERE id=NEW.apprenant_id FOR UPDATE;
 IF TG_OP='INSERT' AND public.quiz_lyon_seuil(NEW.apprenant_id)=138 THEN
   INSERT INTO public.quiz_lyon_cohortes(apprenant_id) VALUES(NEW.apprenant_id) ON CONFLICT DO NOTHING;
 END IF;
 IF NEW.status='submitted' AND public.quiz_lyon_seuil(NEW.apprenant_id)=138
    AND NOT public.quiz_lyon_reponses_completes(NEW.apprenant_id,NEW.reponses) THEN
   RAISE EXCEPTION 'QUIZ_LYON_INCOMPLET: 138 réponses exigées' USING ERRCODE='P0501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.quiz_lyon_garde_reponses() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_00_lyon_cohorte BEFORE INSERT OR UPDATE ON public.reponses_apprenants
 FOR EACH ROW EXECUTE FUNCTION public.quiz_lyon_garde_reponses();

CREATE FUNCTION public.quiz_lyon_cohorte_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Cohorte immuable' USING ERRCODE='42501'; END $$;
REVOKE ALL ON FUNCTION public.quiz_lyon_cohorte_immutable() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER quiz_lyon_cohorte_immutable BEFORE UPDATE OR DELETE ON public.quiz_lyon_cohortes
 FOR EACH ROW EXECUTE FUNCTION public.quiz_lyon_cohorte_immutable();
CREATE FUNCTION public.quiz_lyon_garde_completion() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.module_id=8 AND NEW.status='completed' THEN
   IF TG_OP='UPDATE' AND OLD.status='completed' THEN RETURN NEW; END IF;
   IF NOT public.quiz_lyon_reponses_completes(NEW.apprenant_id) THEN
     RAISE EXCEPTION 'QUIZ_LYON_INCOMPLET: 138 réponses exigées' USING ERRCODE='P0501';
   END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.quiz_lyon_garde_completion() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_01_lyon_completion BEFORE INSERT OR UPDATE ON public.apprenant_module_completion
 FOR EACH ROW EXECUTE FUNCTION public.quiz_lyon_garde_completion();
CREATE OR REPLACE FUNCTION public.save_module_completion(_apprenant_id uuid, _module_id integer, _completed boolean DEFAULT false, _progress integer DEFAULT 0, _score_obtenu integer DEFAULT NULL::integer, _score_max integer DEFAULT NULL::integer, _details jsonb DEFAULT NULL::jsonb)
 RETURNS apprenant_module_completion
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed BOOLEAN;
  result public.apprenant_module_completion;
  v_deja_termine boolean;
  v_nb_questions bigint := 0;
  v_preuve boolean;
  v_manquantes integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role'
  INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'not authorized for this apprenant'; END IF;
  IF _completed THEN
    SELECT EXISTS (SELECT 1 FROM public.apprenant_module_completion
                    WHERE apprenant_id = _apprenant_id AND module_id = _module_id AND status = 'completed')
      INTO v_deja_termine;
    IF NOT v_deja_termine THEN
      IF _module_id=8 AND NOT public.quiz_lyon_reponses_completes(_apprenant_id) THEN
        RAISE EXCEPTION 'QUIZ_LYON_INCOMPLET: 138 réponses exigées' USING ERRCODE='P0501';
      END IF;
      SELECT COALESCE(SUM(CASE WHEN jsonb_typeof(e->'questions') = 'array' THEN jsonb_array_length(e->'questions') ELSE 0 END), 0)
        INTO v_nb_questions
        FROM public.module_editor_state m,
             jsonb_array_elements(CASE WHEN jsonb_typeof(m.module_data->'exercices') = 'array' THEN m.module_data->'exercices' ELSE '[]'::jsonb END) e
       WHERE m.module_id = _module_id;
      IF v_nb_questions = 0 AND EXISTS (SELECT 1 FROM public.module_regles_validation r
                                         WHERE r.module_id = _module_id AND r.protection_serveur AND r.contient_questions IS TRUE) THEN
        v_nb_questions := 1;
      END IF;
      IF v_nb_questions > 0 THEN
        v_preuve := EXISTS (
            SELECT 1 FROM public.reponses_apprenants r, jsonb_each(r.reponses) x
             WHERE r.apprenant_id = _apprenant_id
               AND r.exercice_id LIKE 'module\_' || _module_id || '\_%'
               AND x.value::text NOT IN ('null', '""', '[]', '{}'))
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_details) = 'array' THEN _details ELSE '[]'::jsonb END) d
             WHERE d->'reponseEleve' IS NOT NULL
               AND (d->'reponseEleve')::text NOT IN ('null', '""', '[]', '{}'));
        IF NOT v_preuve THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: aucune réponse enregistrée pour ce module' USING ERRCODE = 'P0501';
        END IF;
      END IF;
      IF jsonb_typeof(_details) = 'array'
         AND _module_id NOT BETWEEN 35 AND 38
         AND NOT EXISTS (SELECT 1 FROM public.module_regles_validation r WHERE r.module_id = _module_id
                          AND r.contient_questions IS TRUE AND r.protection_serveur IS FALSE) THEN
        SELECT count(*) INTO v_manquantes
          FROM jsonb_array_elements(_details) d
         WHERE jsonb_typeof(d) = 'object' AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
           AND NOT (jsonb_typeof(d->'reponseCorrecte') = 'array' AND jsonb_array_length(d->'reponseCorrecte') = 0)
           AND NOT public.reponse_enregistree(d->'reponseEleve')
           AND NOT EXISTS (
             SELECT 1 FROM public.reponses_apprenants r
              WHERE r.apprenant_id = _apprenant_id
                AND r.exercice_id = 'module_' || _module_id || '_exo_' || (d->>'exerciceId')
                AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
                AND jsonb_typeof(r.reponses) = 'object'
                AND NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements(_details) d2
                   WHERE jsonb_typeof(d2) = 'object' AND d2->>'exerciceId' = d->>'exerciceId' AND d2->>'questionId' IS NOT NULL
                     AND NOT (jsonb_typeof(d2->'reponseCorrecte') = 'array' AND jsonb_array_length(d2->'reponseCorrecte') = 0)
                     AND NOT public.reponse_enregistree(r.reponses -> ((d2->>'exerciceId') || '-' || (d2->>'questionId')))));
        IF v_manquantes > 0 THEN
          RAISE EXCEPTION 'MODULE_INCOMPLET: % question(s) QCM sans réponse enregistrée', v_manquantes USING ERRCODE = 'P0501';
        END IF;
      END IF;
    END IF;
  END IF;
  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, score_obtenu, score_max, details)
  VALUES (_apprenant_id, _module_id,
    CASE WHEN _completed THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN _completed THEN 100 ELSE GREATEST(COALESCE(_progress, 0), 0) END,
    CASE WHEN _completed THEN now() ELSE NULL END,
    _score_obtenu, _score_max, COALESCE(_details, '[]'::jsonb))
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET status = CASE WHEN amc.status = 'completed' OR _completed THEN 'completed' ELSE 'in_progress' END,
      progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0), CASE WHEN _completed THEN 100 ELSE 0 END),
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at WHEN _completed THEN now() ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE WHEN _details IS NULL THEN amc.details
                     WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                     WHEN amc.status IS DISTINCT FROM 'completed' AND NOT _completed THEN public.fusion_details_progression(amc.details, _details)
                     ELSE _details END
  RETURNING * INTO result;
  RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.autovalidate_module_if_complete(_apprenant_id uuid, _module_id integer, _total_questions integer)
 RETURNS TABLE(answered integer, total integer, validated boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_answered integer := 0;
  v_done boolean := false;
  v_row public.apprenant_module_completion%ROWTYPE;
BEGIN
  IF _apprenant_id IS NULL OR _module_id IS NULL OR _total_questions IS NULL OR _total_questions <= 0 THEN
    RETURN QUERY SELECT 0, coalesce(_total_questions, 0), false;
    RETURN;
  END IF;

  IF _module_id=8 AND NOT EXISTS (SELECT 1 FROM public.apprenant_module_completion
      WHERE apprenant_id=_apprenant_id AND module_id=8 AND status='completed')
      AND NOT public.quiz_lyon_reponses_completes(_apprenant_id) THEN
    RETURN QUERY SELECT 0, GREATEST(_total_questions,138), false;
    RETURN;
  END IF;

  SELECT count(DISTINCT kv.key)::int INTO v_answered
  FROM public.reponses_apprenants r
  CROSS JOIN LATERAL jsonb_each(coalesce(r.reponses, '{}'::jsonb)) kv
  WHERE r.apprenant_id = _apprenant_id
    AND r.exercice_id LIKE 'module_' || _module_id::text || '_exo_%'
    AND left(kv.key, 1) <> '_'
    AND (
      (jsonb_typeof(kv.value) = 'string' AND btrim(kv.value #>> '{}') <> '')
      OR (jsonb_typeof(kv.value) = 'array' AND jsonb_array_length(kv.value) > 0)
      OR (jsonb_typeof(kv.value) IN ('number', 'boolean'))
    );

  IF v_answered < _total_questions THEN
    RETURN QUERY SELECT coalesce(v_answered, 0), _total_questions, false;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.apprenant_module_completion
  WHERE apprenant_id = _apprenant_id AND module_id = _module_id;

  -- Seul un statut 'completed' (ou une ligne héritée sans statut mais avec
  -- date de fin) fait foi. completed_at seul avec status 'in_progress' ne
  -- prouve rien : on poursuit et on laisse la RPC basculer le statut.
  IF v_row.id IS NOT NULL AND (v_row.status = 'completed' OR (v_row.status IS NULL AND v_row.completed_at IS NOT NULL)) THEN
    RETURN QUERY SELECT v_answered, _total_questions, true;
    RETURN;
  END IF;

  PERFORM public.save_module_completion(
    _apprenant_id,
    _module_id,
    true,
    100,
    v_row.score_obtenu,
    v_row.score_max,
    v_row.details
  );
  v_done := true;

  RETURN QUERY SELECT v_answered, _total_questions, v_done;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.etat_completion_modules(_apprenant_id uuid)
 RETURNS TABLE(module_id integer, status text, completed_at timestamp with time zone, progress numeric, questions_requises integer, questions_prouvees integer, preuve_complete boolean, status_effectif text, progress_effectif numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH c AS (
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
    -- Exigence figée : une question ajoutée après la validation du module
    -- (ou après la première soumission de son exercice), ou supprimée depuis,
    -- n'est jamais exigée rétroactivement. Les réponses restent intactes.
    SELECT DISTINCT ON (q0.module_id, q0.ex, q0.qid) q0.module_id, q0.ex, q0.qid, q0.rep
      FROM q_base q0
      LEFT JOIN LATERAL (
        SELECT max(l.created_at) FILTER (WHERE l.field = 'question_added') AS ajout,
               max(l.created_at) FILTER (WHERE l.field = 'question_deleted') AS supp
          FROM public.module_admin_audit_log l
         WHERE l.module_id = q0.module_id AND l.exercice_id = q0.ex AND l.question_id = q0.qid
           AND l.field IN ('question_added', 'question_deleted')
      ) h ON true
      LEFT JOIN LATERAL (
        SELECT min(s.submitted_at) AS soumis FROM s WHERE s.m = q0.module_id AND s.ex = q0.ex
      ) p ON true
     WHERE NOT (h.supp IS NOT NULL AND (h.ajout IS NULL OR h.supp > h.ajout))
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
  ), e AS (
    SELECT c.module_id, c.status, c.completed_at, c.progress,
           COALESCE(a.req, 0) AS req, COALESCE(a.prv, 0) AS prv,
           CASE
             WHEN c.module_id BETWEEN 35 AND 38 THEN true
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
$function$
;

COMMIT;
