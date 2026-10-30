CREATE OR REPLACE FUNCTION public.reponse_enregistree(v jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $f$
DECLARE e jsonb;
BEGIN
  CASE jsonb_typeof(v)
    WHEN 'string' THEN RETURN (v #>> '{}') ~ '\S';
    WHEN 'number', 'boolean' THEN RETURN true;
    WHEN 'array' THEN
      FOR e IN SELECT x FROM jsonb_array_elements(v) x LOOP
        IF public.reponse_enregistree(e) THEN RETURN true; END IF;
      END LOOP;
      RETURN false;
    WHEN 'object' THEN
      FOR e IN SELECT x.value FROM jsonb_each(v) x LOOP
        IF public.reponse_enregistree(e) THEN RETURN true; END IF;
      END LOOP;
      RETURN false;
    ELSE RETURN false;
  END CASE;
END $f$;

CREATE OR REPLACE FUNCTION public.etat_completion_modules(_apprenant_id uuid)
RETURNS TABLE(module_id integer, status text, completed_at timestamptz, progress numeric,
  questions_requises integer, questions_prouvees integer, preuve_complete boolean,
  status_effectif text, progress_effectif numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $f$
  WITH c AS (
    SELECT amc.module_id, amc.status, amc.completed_at, amc.progress::numeric AS progress, amc.details
      FROM public.apprenant_module_completion amc
     WHERE amc.apprenant_id = _apprenant_id
  ), q AS (
    SELECT c.module_id, d->>'exerciceId' AS ex, d->>'questionId' AS qid,
           public.reponse_enregistree(d->'reponseEleve') AS rep
      FROM c, jsonb_array_elements(CASE WHEN jsonb_typeof(c.details) = 'array' THEN c.details ELSE '[]'::jsonb END) d
     WHERE jsonb_typeof(d) = 'object' AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
       AND NOT (jsonb_typeof(d->'reponseCorrecte') = 'array' AND jsonb_array_length(d->'reponseCorrecte') = 0)
  ), s AS (
    SELECT (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[1]::int AS m,
           (regexp_match(r.exercice_id, '^module_(\d+)_exo_(\d+)$'))[2] AS ex, r.reponses
      FROM public.reponses_apprenants r
     WHERE r.apprenant_id = _apprenant_id AND r.status = 'submitted' AND r.submitted_at IS NOT NULL
       AND jsonb_typeof(r.reponses) = 'object' AND r.exercice_id ~ '^module_\d+_exo_\d+$'
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
             WHEN EXISTS (SELECT 1 FROM public.module_regles_validation r WHERE r.module_id = c.module_id
                           AND r.contient_questions IS TRUE AND r.protection_serveur IS FALSE) THEN true
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
$f$;

CREATE OR REPLACE FUNCTION public.fusion_details_progression(_ancien jsonb, _nouveau jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $f$
  SELECT CASE
    WHEN jsonb_typeof(_nouveau) IS DISTINCT FROM 'array' OR jsonb_typeof(_ancien) IS DISTINCT FROM 'array' THEN _nouveau
    ELSE COALESCE((
      SELECT jsonb_agg(
        CASE WHEN jsonb_typeof(n.v) = 'object' AND NOT public.reponse_enregistree(n.v->'reponseEleve') AND o.rep IS NOT NULL
             THEN jsonb_set(n.v, '{reponseEleve}', o.rep) ELSE n.v END ORDER BY n.i)
        FROM jsonb_array_elements(_nouveau) WITH ORDINALITY n(v, i)
        LEFT JOIN LATERAL (
          SELECT a->'reponseEleve' AS rep FROM jsonb_array_elements(_ancien) a
           WHERE jsonb_typeof(a) = 'object' AND jsonb_typeof(n.v) = 'object'
             AND a->>'exerciceId' = n.v->>'exerciceId' AND a->>'questionId' = n.v->>'questionId'
             AND public.reponse_enregistree(a->'reponseEleve')
           LIMIT 1) o ON true), '[]'::jsonb)
  END
$f$;

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
                AND r.exercice_id LIKE 'module\_' || _module_id || '\_%'
                AND jsonb_typeof(r.reponses) = 'object'
                AND public.reponse_enregistree(r.reponses -> ((d->>'exerciceId') || '-' || (d->>'questionId'))));
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
$function$;

REVOKE ALL ON FUNCTION public.reponse_enregistree(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reponse_enregistree(jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.fusion_details_progression(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fusion_details_progression(jsonb, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.etat_completion_modules(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.etat_completion_modules(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_module_completion(uuid, integer, boolean, integer, integer, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_module_completion(uuid, integer, boolean, integer, integer, integer, jsonb) TO authenticated, service_role;