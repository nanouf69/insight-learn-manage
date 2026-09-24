-- Préparation bascule des anciens passages Bilans (inerte : aucune ligne créée)
CREATE OR REPLACE FUNCTION public.bilan_migration_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Journal append-only : modification ou suppression interdite (%)', TG_TABLE_NAME USING ERRCODE = 'P0500';
END $$;

CREATE TABLE public.bilan_passage_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  tentative integer NOT NULL DEFAULT 1,
  categorie text NOT NULL CHECK (categorie IN ('HISTORIQUE','VERT','ORANGE','ROUGE')),
  motif text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, module_id, exercice_id, tentative)
);
GRANT SELECT ON public.bilan_passage_categories TO authenticated;
GRANT ALL ON public.bilan_passage_categories TO service_role;
ALTER TABLE public.bilan_passage_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit categories passages" ON public.bilan_passage_categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Apprenant lit ses categories" ON public.bilan_passage_categories FOR SELECT TO authenticated USING (public.is_current_user_apprenant(apprenant_id));
CREATE TRIGGER trg_bilan_passage_categories_append_only BEFORE UPDATE OR DELETE ON public.bilan_passage_categories FOR EACH ROW EXECUTE FUNCTION public.bilan_migration_append_only();
CREATE TRIGGER trg_bilan_passage_categories_no_truncate BEFORE TRUNCATE ON public.bilan_passage_categories FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_migration_append_only();

CREATE TABLE public.bilan_reponse_statuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  tentative integer NOT NULL DEFAULT 1,
  cle text NOT NULL,
  uid uuid,
  statut text NOT NULL CHECK (statut IN ('CERTAINE','VERSION_NON_PROUVEE','ORPHELINE','LITIGIEUSE')),
  reponse jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, module_id, exercice_id, tentative, cle)
);
CREATE INDEX idx_bilan_reponse_statuts_lookup ON public.bilan_reponse_statuts(apprenant_id, module_id, exercice_id, tentative);
GRANT SELECT ON public.bilan_reponse_statuts TO authenticated;
GRANT ALL ON public.bilan_reponse_statuts TO service_role;
ALTER TABLE public.bilan_reponse_statuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit statuts reponses" ON public.bilan_reponse_statuts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Apprenant lit ses statuts reponses" ON public.bilan_reponse_statuts FOR SELECT TO authenticated USING (public.is_current_user_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.bilan_reponse_statut_valide()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.statut IN ('ORPHELINE','LITIGIEUSE') AND NEW.uid IS NOT NULL THEN
    RAISE EXCEPTION 'Une réponse orpheline ou litigieuse ne peut être rattachée à aucune question' USING ERRCODE = 'P0501';
  END IF;
  IF NEW.statut IN ('CERTAINE','VERSION_NON_PROUVEE') AND NEW.uid IS NULL THEN
    RAISE EXCEPTION 'Réponse rattachée sans identifiant permanent' USING ERRCODE = 'P0501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bilan_reponse_statut_valide BEFORE INSERT ON public.bilan_reponse_statuts FOR EACH ROW EXECUTE FUNCTION public.bilan_reponse_statut_valide();
CREATE TRIGGER trg_bilan_reponse_statuts_append_only BEFORE UPDATE OR DELETE ON public.bilan_reponse_statuts FOR EACH ROW EXECUTE FUNCTION public.bilan_migration_append_only();
CREATE TRIGGER trg_bilan_reponse_statuts_no_truncate BEFORE TRUNCATE ON public.bilan_reponse_statuts FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_migration_append_only();

CREATE TABLE public.bilan_nouvelle_tentative_autorisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  tentative_source integer NOT NULL,
  tentative_autorisee integer NOT NULL,
  motif text NOT NULL,
  autorise_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, module_id, exercice_id, tentative_autorisee)
);
GRANT SELECT ON public.bilan_nouvelle_tentative_autorisations TO authenticated;
GRANT ALL ON public.bilan_nouvelle_tentative_autorisations TO service_role;
ALTER TABLE public.bilan_nouvelle_tentative_autorisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit autorisations tentatives" ON public.bilan_nouvelle_tentative_autorisations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_bilan_autorisations_append_only BEFORE UPDATE OR DELETE ON public.bilan_nouvelle_tentative_autorisations FOR EACH ROW EXECUTE FUNCTION public.bilan_migration_append_only();
CREATE TRIGGER trg_bilan_autorisations_no_truncate BEFORE TRUNCATE ON public.bilan_nouvelle_tentative_autorisations FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_migration_append_only();

-- Action Admin explicite, confirmée, idempotente (double-clic), journalisée
CREATE OR REPLACE FUNCTION public.bilan_autoriser_nouvelle_tentative(p_apprenant_id uuid, p_module_id integer, p_exercice_id integer, p_motif text, p_confirmation text)
RETURNS public.bilan_nouvelle_tentative_autorisations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.bilan_nouvelle_tentative_autorisations; v_src integer; v_next integer;
BEGIN
  IF auth.uid() IS NULL AND current_setting('app.bilan_snapshot_test', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'AUTORISER' THEN
    RAISE EXCEPTION 'Confirmation requise' USING ERRCODE = 'P0502';
  END IF;
  IF COALESCE(btrim(p_motif),'') = '' THEN
    RAISE EXCEPTION 'Motif obligatoire' USING ERRCODE = 'P0502';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('autorisation:'||p_apprenant_id||':'||p_module_id||':'||p_exercice_id, 0));
  SELECT max(tentative) INTO v_src FROM bilan_passage_categories
   WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND categorie = 'ROUGE';
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'Aucun passage ROUGE pour cet apprenant et cette matière' USING ERRCODE = 'P0503';
  END IF;
  -- autorisation déjà accordée et pas encore utilisée : on la renvoie (double-clic)
  SELECT * INTO a FROM bilan_nouvelle_tentative_autorisations x
   WHERE x.apprenant_id = p_apprenant_id AND x.module_id = p_module_id AND x.exercice_id = p_exercice_id
     AND NOT EXISTS (SELECT 1 FROM bilan_passage_snapshots s WHERE s.apprenant_id = x.apprenant_id AND s.module_id = x.module_id AND s.exercice_id = x.exercice_id AND s.tentative = x.tentative_autorisee)
   ORDER BY x.tentative_autorisee DESC LIMIT 1;
  IF FOUND THEN RETURN a; END IF;
  SELECT GREATEST(
     COALESCE((SELECT max(tentative) FROM bilan_passage_categories WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id),0),
     COALESCE((SELECT max(tentative) FROM bilan_passage_snapshots WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id),0),
     COALESCE((SELECT max(tentative_autorisee) FROM bilan_nouvelle_tentative_autorisations WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id),0)) + 1
  INTO v_next;
  INSERT INTO bilan_nouvelle_tentative_autorisations(apprenant_id, module_id, exercice_id, tentative_source, tentative_autorisee, motif, autorise_par)
  VALUES (p_apprenant_id, p_module_id, p_exercice_id, v_src, v_next, btrim(p_motif), auth.uid())
  RETURNING * INTO a;
  RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.bilan_autoriser_nouvelle_tentative(uuid, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bilan_autoriser_nouvelle_tentative(uuid, integer, integer, text, text) TO authenticated, service_role;

-- Démarrage d'un snapshot : refus pour un passage HISTORIQUE/ROUGE et pour une nouvelle tentative non autorisée
CREATE OR REPLACE FUNCTION public.bilan_demarrer_passage(p_apprenant_id uuid, p_module_id integer, p_exercice_id integer, p_tentative integer, p_operation_id uuid DEFAULT NULL::uuid)
 RETURNS bilan_passage_snapshots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.bilan_passage_snapshots; v_exo jsonb; v_qs jsonb;
BEGIN
  IF p_module_id NOT IN (5, 11) AND current_setting('app.bilan_snapshot_test', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Module non concerné par les snapshots Bilan' USING ERRCODE = 'P0492';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NOT public.is_current_user_apprenant(p_apprenant_id) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE((SELECT actif FROM bilan_snapshot_flags WHERE module_id = p_module_id), false) THEN
    RAISE EXCEPTION 'Snapshots Bilan non activés pour ce module' USING ERRCODE = 'P0493';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_apprenant_id::text||':'||p_module_id||':'||p_exercice_id||':'||p_tentative, 0));
  SELECT * INTO s FROM bilan_passage_snapshots
   WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative = p_tentative;
  IF FOUND THEN RETURN s; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO s FROM bilan_passage_snapshots WHERE operation_id = p_operation_id;
    IF FOUND THEN RETURN s; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM bilan_passage_categories WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative = p_tentative AND categorie IN ('HISTORIQUE','ROUGE')) THEN
    RAISE EXCEPTION 'Passage historique conservé : aucun snapshot' USING ERRCODE = 'P0499';
  END IF;
  IF EXISTS (SELECT 1 FROM bilan_passage_categories WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative < p_tentative AND categorie = 'ROUGE')
     AND NOT EXISTS (SELECT 1 FROM bilan_nouvelle_tentative_autorisations WHERE apprenant_id = p_apprenant_id AND module_id = p_module_id AND exercice_id = p_exercice_id AND tentative_autorisee = p_tentative) THEN
    RAISE EXCEPTION 'Nouvelle tentative non autorisée par l''Admin' USING ERRCODE = 'P0499';
  END IF;
  SELECT e INTO v_exo FROM module_editor_state m, jsonb_array_elements(m.module_data->'exercices') e
   WHERE m.module_id = p_module_id AND (e->>'id')::int = p_exercice_id;
  IF v_exo IS NULL THEN RAISE EXCEPTION 'Matière introuvable' USING ERRCODE = 'P0494'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'position', o, 'uid', q->>'uid', 'question_id', q->>'id', 'cle', p_exercice_id||'-'||(q->>'id'),
      'type', q->>'type', 'enonce', q->'enonce', 'choix', COALESCE(q->'choix','[]'::jsonb),
      'image', COALESCE(q->'image', q->'imageUrl', q->'image_url'),
      'reponseQRC', q->'reponseQRC', 'reponses_possibles', q->'reponses_possibles',
      'bareme', q->'bareme', 'question_source', q) ORDER BY o), '[]'::jsonb)
    INTO v_qs FROM jsonb_array_elements(COALESCE(v_exo->'questions','[]'::jsonb)) WITH ORDINALITY x(q, o);
  IF jsonb_array_length(v_qs) = 0 THEN RAISE EXCEPTION 'Matière sans question' USING ERRCODE = 'P0495'; END IF;
  IF COALESCE((SELECT actif FROM bilan_identite_flags WHERE module_id = p_module_id), false)
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_qs) z WHERE z->>'uid' IS NULL) THEN
    RAISE EXCEPTION 'Snapshot refusé : question sans identifiant permanent' USING ERRCODE = 'P0498';
  END IF;
  INSERT INTO bilan_passage_snapshots(apprenant_id, module_id, exercice_id, filiere, matiere, tentative, passage_cle,
     questions, nb_questions, bareme, empreinte, empreinte_source, operation_id)
  VALUES (p_apprenant_id, p_module_id, p_exercice_id,
     CASE p_module_id WHEN 5 THEN 'VTC' WHEN 11 THEN 'TAXI' ELSE 'TEST' END,
     COALESCE(v_exo->>'titre',''), p_tentative, 'module_'||p_module_id||'_exo_'||p_exercice_id,
     v_qs, jsonb_array_length(v_qs), v_exo->'bareme', md5(v_qs::text), md5(v_exo::text), p_operation_id)
  RETURNING * INTO s;
  RETURN s;
END $function$;

-- Réponses historiques verrouillées : le serveur conserve toujours la valeur d'origine
CREATE OR REPLACE FUNCTION public.bilan_garde_reponses_verrouillees()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text[]; r record;
BEGIN
  m := regexp_match(NEW.exercice_id, '^module_(\d+)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  FOR r IN SELECT cle, reponse FROM bilan_reponse_statuts
            WHERE apprenant_id = NEW.apprenant_id AND module_id = m[1]::int AND exercice_id = m[2]::int
              AND tentative = COALESCE(NEW.tentative, 1) AND statut <> 'CERTAINE' LOOP
    IF TG_OP = 'UPDATE' AND OLD.reponses ? r.cle THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], OLD.reponses->r.cle);
    ELSIF r.reponse IS NOT NULL THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], r.reponse);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_0b_bilan_reponses_verrouillees BEFORE INSERT OR UPDATE OF reponses ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION public.bilan_garde_reponses_verrouillees();