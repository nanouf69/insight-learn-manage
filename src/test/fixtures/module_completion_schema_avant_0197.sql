CREATE TABLE public.apprenant_module_completion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  completed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  score_obtenu integer,
  score_max integer,
  details jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'in_progress'::text NOT NULL,
  progress integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  pages_completees jsonb DEFAULT '[]'::jsonb NOT NULL
);

ALTER TABLE public.apprenant_module_completion ADD CONSTRAINT apprenant_module_completion_apprenant_id_module_id_key UNIQUE (apprenant_id, module_id);

ALTER TABLE public.apprenant_module_completion ADD CONSTRAINT apprenant_module_completion_pkey PRIMARY KEY (id);

ALTER TABLE public.apprenant_module_completion ADD CONSTRAINT apprenant_module_completion_apprenant_id_fkey FOREIGN KEY (apprenant_id) REFERENCES apprenants(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.garde_donnee_eleve()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mode text := TG_ARGV[0];
  v_row jsonb := to_jsonb(OLD);
  v_app uuid;
  v_test boolean := false;
  v_bypass boolean := coalesce(current_setting('app.suppression_eleve_autorisee', true), '') = 'on';
  v_refuse boolean;
BEGIN
  BEGIN
    v_app := nullif(CASE WHEN TG_TABLE_NAME='apprenants' THEN v_row->>'id' ELSE v_row->>'apprenant_id' END, '')::uuid;
  EXCEPTION WHEN others THEN v_app := NULL; END;
  IF v_app IS NOT NULL THEN
    BEGIN v_test := coalesce(public.est_compte_test(v_app), false); EXCEPTION WHEN others THEN v_test := false; END;
  END IF;
  v_refuse := CASE v_mode
    WHEN 'refuser' THEN true
    WHEN 'signature' THEN coalesce(v_row->>'type_document','') ~* '(emarg|signat)'
    ELSE false END;
  IF v_refuse AND NOT v_bypass AND NOT v_test THEN
    RAISE EXCEPTION USING ERRCODE='P0520',
      MESSAGE = format('Donnée élève protégée (%s) : suppression interdite. Aucune donnée élève ne doit disparaître.', TG_TABLE_NAME);
  END IF;
  INSERT INTO public.donnees_eleves_suppressions(table_nom, apprenant_id, ligne, auteur_uid, auteur_role, compte_test, motif)
  VALUES (TG_TABLE_NAME, v_app, v_row, auth.uid(), current_user, v_test,
          CASE WHEN v_bypass THEN 'autorisation SQL explicite' WHEN v_test THEN 'compte de test' ELSE 'suppression autorisée (table non bloquante)' END);
  RETURN OLD;
END $function$;

REVOKE ALL ON FUNCTION public.garde_donnee_eleve FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.garde_donnee_eleve TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.garde_donnee_eleve TO anon;

GRANT EXECUTE ON FUNCTION public.garde_donnee_eleve TO authenticated;

GRANT EXECUTE ON FUNCTION public.garde_donnee_eleve TO service_role;

CREATE OR REPLACE FUNCTION public.garde_module_termine_note()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_champs text[] := '{}';
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed'
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF OLD.score_obtenu IS NOT NULL AND NEW.score_obtenu IS DISTINCT FROM OLD.score_obtenu THEN
    v_champs := array_append(v_champs, 'score_obtenu'); NEW.score_obtenu := OLD.score_obtenu; END IF;
  IF OLD.score_max IS NOT NULL AND NEW.score_max IS DISTINCT FROM OLD.score_max THEN
    v_champs := array_append(v_champs, 'score_max'); NEW.score_max := OLD.score_max; END IF;
  IF jsonb_typeof(OLD.details) = 'array' AND jsonb_array_length(OLD.details) > 0
     AND NEW.details IS DISTINCT FROM OLD.details THEN
    v_champs := array_append(v_champs, 'details'); NEW.details := OLD.details; END IF;
  IF NEW.status IS DISTINCT FROM 'completed' THEN v_champs := array_append(v_champs, 'status'); NEW.status := 'completed'; END IF;
  IF array_length(v_champs, 1) > 0 THEN
    INSERT INTO public.quiz_valide_reecritures_refusees (table_cible, apprenant_id, cle, champs, auteur)
    VALUES ('apprenant_module_completion', OLD.apprenant_id, 'module_' || OLD.module_id, v_champs, auth.uid());
  END IF;
  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.garde_module_termine_note FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.garde_module_termine_note TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.garde_module_termine_note TO anon;

GRANT EXECUTE ON FUNCTION public.garde_module_termine_note TO authenticated;

GRANT EXECUTE ON FUNCTION public.garde_module_termine_note TO service_role;

CREATE OR REPLACE FUNCTION public.garde_preuve_examens_blancs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.module_id NOT IN (35,36,37,38) OR NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status='completed' THEN RETURN NEW; END IF;
  -- INSERT ... ON CONFLICT : le BEFORE INSERT s'exécute avant la résolution du conflit ;
  -- une ligne déjà « completed » (historique) laisse passer, la ligne n'est pas modifiée ici.
  IF TG_OP='INSERT' AND EXISTS (SELECT 1 FROM public.apprenant_module_completion c
       WHERE c.apprenant_id=NEW.apprenant_id AND c.module_id=NEW.module_id AND c.status='completed') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF public.examens_blancs_preuve_soumission(NEW.apprenant_id, NEW.module_id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'MODULE_INCOMPLET: examens blancs 6/6 non soumis (module %)', NEW.module_id USING ERRCODE='P0501';
END;
$function$;

REVOKE ALL ON FUNCTION public.garde_preuve_examens_blancs FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.garde_preuve_examens_blancs TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.garde_preuve_examens_blancs TO anon;

GRANT EXECUTE ON FUNCTION public.garde_preuve_examens_blancs TO authenticated;

GRANT EXECUTE ON FUNCTION public.garde_preuve_examens_blancs TO service_role;

CREATE OR REPLACE FUNCTION public.protect_module_completion_terminal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_privileged BOOLEAN;
BEGIN
  is_privileged := (current_setting('role', true) = 'service_role')
                   OR public.has_role(auth.uid(), 'admin');

  NEW.updated_at := now();

  IF OLD.status = 'completed' THEN
    IF is_privileged AND NEW.status <> 'completed' THEN
      -- deliberate admin/service reset: allowed
      RETURN NEW;
    END IF;

    -- terminal state: freeze validation, never regress
    NEW.status := 'completed';
    NEW.progress := GREATEST(COALESCE(NEW.progress, 0), COALESCE(OLD.progress, 100), 100);
    NEW.completed_at := COALESCE(OLD.completed_at, NEW.completed_at, now());
    IF NEW.score_obtenu IS NULL THEN NEW.score_obtenu := OLD.score_obtenu; END IF;
    IF NEW.score_max IS NULL THEN NEW.score_max := OLD.score_max; END IF;
    IF NEW.details IS NULL
       OR jsonb_typeof(NEW.details) <> 'array'
       OR (jsonb_array_length(NEW.details) = 0 AND COALESCE(jsonb_array_length(OLD.details), 0) > 0)
    THEN
      NEW.details := OLD.details;
    END IF;
    RETURN NEW;
  END IF;

  -- not completed yet: never let progress go backwards
  NEW.progress := GREATEST(COALESCE(NEW.progress, 0), COALESCE(OLD.progress, 0));
  IF NEW.status = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.progress := 100;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_module_completion_terminal FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.protect_module_completion_terminal TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_auto_send_pratique_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.module_id IN (6, 8) THEN
    PERFORM net.http_post(
      url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/auto-send-pratique-booking',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('trigger', 'module_completion', 'apprenant_id', NEW.apprenant_id, 'module_id', NEW.module_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trigger_auto_send_pratique_booking FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trigger_auto_send_pratique_booking TO service_role;

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

REVOKE ALL ON FUNCTION public.save_module_completion FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_module_completion TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_module_completion TO service_role;

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
    now(),
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

REVOKE ALL ON FUNCTION public.save_module_pages_progress FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_module_pages_progress TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_module_pages_progress TO service_role;

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

REVOKE ALL ON FUNCTION public.autovalidate_module_if_complete FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete TO anon;

GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete TO authenticated;

GRANT EXECUTE ON FUNCTION public.autovalidate_module_if_complete TO service_role;

CREATE TRIGGER trg_00_garde_module_termine_note BEFORE UPDATE ON public.apprenant_module_completion FOR EACH ROW EXECUTE FUNCTION garde_module_termine_note();
CREATE TRIGGER trg_01_garde_preuve_examens_blancs BEFORE INSERT OR UPDATE ON public.apprenant_module_completion FOR EACH ROW EXECUTE FUNCTION garde_preuve_examens_blancs();
CREATE TRIGGER trg_auto_send_pratique_booking AFTER INSERT ON public.apprenant_module_completion FOR EACH ROW EXECUTE FUNCTION trigger_auto_send_pratique_booking();
CREATE TRIGGER trg_protect_module_completion_terminal BEFORE UPDATE ON public.apprenant_module_completion FOR EACH ROW EXECUTE FUNCTION protect_module_completion_terminal();
CREATE TRIGGER trg_zz_garde_donnee_eleve BEFORE DELETE ON public.apprenant_module_completion FOR EACH ROW EXECUTE FUNCTION garde_donnee_eleve('refuser');

ALTER TABLE public.apprenant_module_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all completions" ON public.apprenant_module_completion AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their own completions" ON public.apprenant_module_completion AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1

   FROM apprenants a

  WHERE ((a.id = apprenant_module_completion.apprenant_id) AND (a.auth_user_id = auth.uid())))));

CREATE POLICY "Comptes test exclus des lectures" ON public.apprenant_module_completion AS RESTRICTIVE FOR SELECT TO authenticated USING (((NOT est_compte_test(apprenant_id)) OR est_proprietaire_apprenant(apprenant_id)));

CREATE POLICY "Learner can insert own completions" ON public.apprenant_module_completion AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_current_user_apprenant(apprenant_id));

CREATE POLICY "Learner can select own completions" ON public.apprenant_module_completion AS PERMISSIVE FOR SELECT TO authenticated USING (is_current_user_apprenant(apprenant_id));

CREATE POLICY "Learner can update own completions" ON public.apprenant_module_completion AS PERMISSIVE FOR UPDATE TO authenticated USING (is_current_user_apprenant(apprenant_id)) WITH CHECK (is_current_user_apprenant(apprenant_id));

CREATE POLICY "Service role can select apprenant_module_completion" ON public.apprenant_module_completion AS PERMISSIVE FOR SELECT TO service_role USING (true);

GRANT INSERT, SELECT, UPDATE, DELETE ON public.apprenant_module_completion TO anon;

GRANT INSERT, SELECT, UPDATE, DELETE ON public.apprenant_module_completion TO authenticated;

GRANT INSERT, SELECT, UPDATE, DELETE ON public.apprenant_module_completion TO service_role;
