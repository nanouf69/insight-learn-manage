-- 0197 (23/10/2026) — Réparation de la régression 23502 introduite par 0193.
-- Cause directe prouvée : 0193 insère completed_at = NULL pour une simple
-- progression, mais la colonne était NOT NULL DEFAULT now(). PostgreSQL
-- contrôle NOT NULL sur la ligne proposée AVANT la résolution ON CONFLICT :
-- toute sauvegarde de progression non terminée échouait (23502), même sur une
-- ligne déjà existante (774 refus, 8 élèves, 22/10).
-- Choix : completed_at devient facultative (NULL = pas encore validé) au lieu
-- de remettre now(), qui fabriquerait une fausse date de fin.
-- Invariant ajouté : une ligne « completed » a toujours une date.
-- Une validation réelle depuis une ligne non terminée prend l'instant serveur
-- de validation (plus l'ancienne date de création héritée de l'ancien défaut).
-- Aucune ligne existante n'est modifiée ; DEFAULT now() conservé pour les
-- anciens appels directs (compatibilité).

ALTER TABLE public.apprenant_module_completion ALTER COLUMN completed_at DROP NOT NULL;

ALTER TABLE public.apprenant_module_completion
  ADD CONSTRAINT amc_terminee_a_une_date CHECK (status IS DISTINCT FROM 'completed' OR completed_at IS NOT NULL);

COMMENT ON COLUMN public.apprenant_module_completion.completed_at IS
  'Instant réel de validation serveur. NULL = module non validé. Lignes in_progress antérieures au 23/10/2026 : peut contenir l''ancienne date de création par défaut, jamais une preuve de fin sans status = completed.';

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
      completed_at = CASE WHEN amc.status = 'completed' THEN amc.completed_at WHEN _completed THEN now() ELSE amc.completed_at END,
      score_obtenu = COALESCE(_score_obtenu, amc.score_obtenu),
      score_max = COALESCE(_score_max, amc.score_max),
      details = CASE WHEN _details IS NULL THEN amc.details
                     WHEN amc.status = 'completed' AND jsonb_array_length(COALESCE(_details, '[]'::jsonb)) = 0 THEN amc.details
                     ELSE _details END
  RETURNING * INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_module_pages_progress(_apprenant_id uuid, _module_id integer, _pages jsonb, _progress integer DEFAULT 0)
 RETURNS apprenant_module_completion
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed BOOLEAN;
  result public.apprenant_module_completion;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
    OR current_setting('role', true) = 'service_role'
  INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not authorized for this apprenant';
  END IF;

  INSERT INTO public.apprenant_module_completion AS amc
    (apprenant_id, module_id, status, progress, completed_at, details, pages_completees)
  VALUES (
    _apprenant_id,
    _module_id,
    'in_progress',
    GREATEST(COALESCE(_progress, 0), 0),
    NULL,
    '[]'::jsonb,
    COALESCE(_pages, '[]'::jsonb)
  )
  ON CONFLICT (apprenant_id, module_id) DO UPDATE
  SET progress = GREATEST(COALESCE(amc.progress, 0), COALESCE(_progress, 0)),
      pages_completees = (
        SELECT COALESCE(jsonb_agg(DISTINCT p ORDER BY p), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(amc.pages_completees, '[]'::jsonb) || COALESCE(_pages, '[]'::jsonb)) AS t(p)
      )
  RETURNING * INTO result;

  RETURN result;
END;
$function$;
