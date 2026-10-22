-- Correctif compteur modules élève (22/10/2026).
-- Causes prouvées sur le dossier 1170784c-31b4-4ccb-99f3-cbfd5c353e62 :
-- 1) save_module_completion posait completed_at = now() même pour une simple
--    progression (_completed = false) : la ligne semblait « finie ».
-- 2) autovalidate_module_if_complete considérait completed_at non nul comme
--    « déjà validé » et ne basculait jamais status vers 'completed'.
-- Résultat : modules avec toutes leurs preuves restaient 'in_progress' et
-- l'accueil affichait « 6 modules sur 7 » alors que 4 étaient terminés.
-- Aucune réponse, note, date de fin ou donnée élève n'est modifiée.

-- 1) completed_at ne doit exister que pour une validation réelle, et une
--    date de fin déjà enregistrée n'est jamais réécrite.
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
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at WHEN _completed THEN COALESCE(amc.completed_at, now()) ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE WHEN _details IS NULL THEN amc.details
                     WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                     ELSE _details END
  RETURNING * INTO result;
  RETURN result;
END;
$function$;

-- 2) L'autovalidation ne court-circuite que sur un VRAI statut terminé
--    ('completed', ou ligne héritée sans statut avec date). Une ligne
--    'in_progress' avec completed_at (séquelles du bug 1) est désormais
--    réparée : si toutes les réponses sont prouvées, le statut bascule.
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
$function$;

-- 3) Réconciliation ciblée du SEUL dossier 1170784c-31b4-4ccb-99f3-cbfd5c353e62.
--    Les preuves sont recomptées ici : si un seul seuil n'est pas atteint,
--    toute la migration échoue et rien n'est écrit. Seul le statut bascule :
--    completed_at, scores et détails existants sont conservés tels quels.
--    Modules 5 (aucune réponse), 8 (aucune preuve) et 35 (examens blancs,
--    2/6 faits) ne sont volontairement PAS touchés.
DO $$
DECLARE
  v_app constant uuid := '1170784c-31b4-4ccb-99f3-cbfd5c353e62';
  v2 int; v3 int; v4 int; v_n int;
BEGIN
  SELECT count(DISTINCT kv.key) INTO v2
    FROM public.reponses_apprenants r, jsonb_each(coalesce(r.reponses, '{}'::jsonb)) kv
   WHERE r.apprenant_id = v_app AND r.exercice_id LIKE 'module\_2\_%' AND r.exercice_id NOT LIKE '%revision%'
     AND left(kv.key,1) <> '_'
     AND ((jsonb_typeof(kv.value)='string' AND btrim(kv.value #>> '{}') <> '') OR (jsonb_typeof(kv.value)='array' AND jsonb_array_length(kv.value)>0) OR jsonb_typeof(kv.value) IN ('number','boolean'));
  SELECT count(DISTINCT kv.key) INTO v3
    FROM public.reponses_apprenants r, jsonb_each(coalesce(r.reponses, '{}'::jsonb)) kv
   WHERE r.apprenant_id = v_app AND r.exercice_id LIKE 'module\_3\_%' AND r.exercice_id NOT LIKE '%revision%'
     AND left(kv.key,1) <> '_'
     AND ((jsonb_typeof(kv.value)='string' AND btrim(kv.value #>> '{}') <> '') OR (jsonb_typeof(kv.value)='array' AND jsonb_array_length(kv.value)>0) OR jsonb_typeof(kv.value) IN ('number','boolean'));
  SELECT count(DISTINCT kv.key) INTO v4
    FROM public.reponses_apprenants r, jsonb_each(coalesce(r.reponses, '{}'::jsonb)) kv
   WHERE r.apprenant_id = v_app AND r.exercice_id LIKE 'module\_4\_%' AND r.exercice_id NOT LIKE '%revision%'
     AND left(kv.key,1) <> '_'
     AND ((jsonb_typeof(kv.value)='string' AND btrim(kv.value #>> '{}') <> '') OR (jsonb_typeof(kv.value)='array' AND jsonb_array_length(kv.value)>0) OR jsonb_typeof(kv.value) IN ('number','boolean'));
  IF v2 < 842 OR v3 < 47 OR v4 < 875 THEN
    RAISE EXCEPTION 'PREUVES_INSUFFISANTES module2=% module3=% module4=% : aucune reconciliation', v2, v3, v4;
  END IF;
  UPDATE public.apprenant_module_completion
     SET status = 'completed', updated_at = now()
   WHERE apprenant_id = v_app AND module_id IN (2, 3, 4)
     AND status = 'in_progress' AND completed_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'RECONCILIATION_INATTENDUE : % ligne(s) au lieu de 3', v_n;
  END IF;
END $$;