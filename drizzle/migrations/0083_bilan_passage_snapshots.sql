CREATE TABLE public.bilan_snapshot_flags (
  module_id int PRIMARY KEY,
  actif boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bilan_snapshot_flags TO authenticated;
GRANT ALL ON public.bilan_snapshot_flags TO service_role;
ALTER TABLE public.bilan_snapshot_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture flags snapshot bilan" ON public.bilan_snapshot_flags FOR SELECT TO authenticated USING (true);
INSERT INTO public.bilan_snapshot_flags(module_id, actif) VALUES (5,false),(11,false);

CREATE TABLE public.bilan_passage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id int NOT NULL,
  exercice_id int NOT NULL,
  filiere text NOT NULL,
  matiere text NOT NULL,
  tentative int NOT NULL,
  passage_cle text NOT NULL,
  questions jsonb NOT NULL,
  nb_questions int NOT NULL,
  bareme jsonb,
  empreinte text NOT NULL,
  empreinte_source text NOT NULL,
  operation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, module_id, exercice_id, tentative),
  UNIQUE (operation_id)
);
GRANT SELECT ON public.bilan_passage_snapshots TO authenticated;
GRANT ALL ON public.bilan_passage_snapshots TO service_role;
ALTER TABLE public.bilan_passage_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit snapshots bilan" ON public.bilan_passage_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Apprenant lit ses snapshots bilan" ON public.bilan_passage_snapshots FOR SELECT TO authenticated USING (public.is_current_user_apprenant(apprenant_id));

CREATE OR REPLACE FUNCTION public.bilan_snapshot_immuable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Snapshot de passage Bilan immuable : % refusé.', TG_OP USING ERRCODE = 'P0491';
END $$;
CREATE TRIGGER trg_bilan_snapshot_immuable BEFORE UPDATE OR DELETE ON public.bilan_passage_snapshots
FOR EACH ROW EXECUTE FUNCTION public.bilan_snapshot_immuable();
CREATE TRIGGER trg_bilan_snapshot_no_truncate BEFORE TRUNCATE ON public.bilan_passage_snapshots
FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_snapshot_immuable();

-- Démarrage / reprise : retourne le snapshot existant, sinon le crée atomiquement.
CREATE OR REPLACE FUNCTION public.bilan_demarrer_passage(
  p_apprenant_id uuid, p_module_id int, p_exercice_id int, p_tentative int, p_operation_id uuid DEFAULT NULL)
RETURNS public.bilan_passage_snapshots
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  SELECT e INTO v_exo FROM module_editor_state m, jsonb_array_elements(m.module_data->'exercices') e
   WHERE m.module_id = p_module_id AND (e->>'id')::int = p_exercice_id;
  IF v_exo IS NULL THEN RAISE EXCEPTION 'Matière introuvable' USING ERRCODE = 'P0494'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'position', o, 'question_id', q->>'id', 'cle', p_exercice_id||'-'||(q->>'id'),
      'type', q->>'type', 'enonce', q->'enonce', 'choix', COALESCE(q->'choix','[]'::jsonb),
      'image', COALESCE(q->'image', q->'imageUrl', q->'image_url'),
      'reponseQRC', q->'reponseQRC', 'reponses_possibles', q->'reponses_possibles',
      'bareme', q->'bareme', 'question_source', q) ORDER BY o), '[]'::jsonb)
    INTO v_qs FROM jsonb_array_elements(COALESCE(v_exo->'questions','[]'::jsonb)) WITH ORDINALITY x(q, o);
  IF jsonb_array_length(v_qs) = 0 THEN RAISE EXCEPTION 'Matière sans question' USING ERRCODE = 'P0495'; END IF;
  INSERT INTO bilan_passage_snapshots(apprenant_id, module_id, exercice_id, filiere, matiere, tentative, passage_cle,
     questions, nb_questions, bareme, empreinte, empreinte_source, operation_id)
  VALUES (p_apprenant_id, p_module_id, p_exercice_id,
     CASE p_module_id WHEN 5 THEN 'VTC' WHEN 11 THEN 'TAXI' ELSE 'TEST' END,
     COALESCE(v_exo->>'titre',''), p_tentative, 'module_'||p_module_id||'_exo_'||p_exercice_id,
     v_qs, jsonb_array_length(v_qs), v_exo->'bareme', md5(v_qs::text), md5(v_exo::text), p_operation_id)
  RETURNING * INTO s;
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.bilan_demarrer_passage(uuid,int,int,int,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bilan_demarrer_passage(uuid,int,int,int,uuid) TO authenticated, service_role;

-- Contrôle d'identité passage + question : la clé doit exister dans le snapshot du passage.
CREATE OR REPLACE FUNCTION public.bilan_snapshot_question_valide(p_snapshot_id uuid, p_cle text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM bilan_passage_snapshots s, jsonb_array_elements(s.questions) q
                 WHERE s.id = p_snapshot_id AND q->>'cle' = p_cle)
$$;
GRANT EXECUTE ON FUNCTION public.bilan_snapshot_question_valide(uuid,text) TO authenticated, service_role;