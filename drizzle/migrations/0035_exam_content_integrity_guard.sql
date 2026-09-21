CREATE OR REPLACE FUNCTION public.exam_editor_required_schema_version()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT '2'::text $$;

CREATE OR REPLACE FUNCTION public.exam_id_for_module(_module_id integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _module_id
    WHEN 90000 THEN 'EB1' WHEN 90001 THEN 'EB2' WHEN 90002 THEN 'EB3'
    WHEN 90003 THEN 'EB4' WHEN 90004 THEN 'EB5' WHEN 90005 THEN 'EB6'
    WHEN 90006 THEN 'EB1-TAXI' WHEN 90007 THEN 'EB2-TAXI' WHEN 90008 THEN 'EB3-TAXI'
    WHEN 90009 THEN 'EB4-TAXI' WHEN 90010 THEN 'EB5-TAXI' WHEN 90011 THEN 'EB6-TAXI'
    WHEN 90012 THEN 'eb1-ta' WHEN 90018 THEN 'eb2-ta' WHEN 90019 THEN 'eb3-ta'
    WHEN 90020 THEN 'eb4-ta' WHEN 90021 THEN 'eb5-ta' WHEN 90022 THEN 'eb6-ta'
    WHEN 90013 THEN 'eb1-va' WHEN 90023 THEN 'eb2-va' WHEN 90024 THEN 'eb3-va'
    WHEN 90025 THEN 'eb4-va' WHEN 90026 THEN 'eb5-va' WHEN 90027 THEN 'eb6-va'
    WHEN 90014 THEN 'bilan-taxi' WHEN 90015 THEN 'bilan-vtc'
    WHEN 90016 THEN 'bilan-ta' WHEN 90017 THEN 'bilan-va'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.exam_numero_from_id(_exam_id text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(coalesce(_exam_id, '')) ~ '^eb\s*[0-9]+' THEN
      (regexp_match(lower(_exam_id), '^eb\s*([0-9]+)'))[1]::integer
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.exam_matiere_signature(_matiere jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT md5(coalesce(string_agg(
    concat_ws('|',
      coalesce(q->>'id', ''), coalesce(q->>'type', ''), coalesce(q->>'enonce', ''),
      coalesce(q->'choix', '[]'::jsonb)::text, coalesce(q->>'reponseQRC', ''),
      coalesce(q->>'points', ''), coalesce(q->>'image', '')),
    '##' ORDER BY ord), ''))
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(coalesce(_matiere->'questions', 'null'::jsonb)) = 'array'
         THEN _matiere->'questions' ELSE '[]'::jsonb END
  ) WITH ORDINALITY t(q, ord)
$$;

CREATE TABLE IF NOT EXISTS public.exam_content_write_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  module_id integer,
  exam_id text,
  matiere_id text,
  action text NOT NULL,
  origine text,
  statut text NOT NULL DEFAULT 'accepte',
  motif_refus text,
  questions_avant integer,
  questions_apres integer,
  signature_avant text,
  signature_apres text,
  examen_source_suspecte text,
  author_user_id uuid DEFAULT auth.uid(),
  author_email text,
  editor_schema_version text,
  details jsonb
);

CREATE INDEX IF NOT EXISTS exam_content_write_log_created_at_idx
  ON public.exam_content_write_log (created_at DESC);

GRANT SELECT, INSERT ON public.exam_content_write_log TO authenticated;
GRANT ALL ON public.exam_content_write_log TO service_role;

ALTER TABLE public.exam_content_write_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins lisent le journal d ecriture examens" ON public.exam_content_write_log;
CREATE POLICY "Admins lisent le journal d ecriture examens"
  ON public.exam_content_write_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Utilisateurs authentifies journalisent les refus" ON public.exam_content_write_log;
CREATE POLICY "Utilisateurs authentifies journalisent les refus"
  ON public.exam_content_write_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_exam_content_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exam_id text;
  v_declared text;
  v_numero integer;
  v_version text;
  v_origine text;
  v_mat jsonb;
  v_old_mat jsonb;
  v_sig text;
  v_old_sig text;
  v_conflit record;
  v_email text;
BEGIN
  IF NEW.module_id IS NULL OR NEW.module_id < 90000 OR NEW.module_id > 90027 THEN
    RETURN NEW;
  END IF;

  v_exam_id := public.exam_id_for_module(NEW.module_id);
  IF v_exam_id IS NULL THEN
    RAISE EXCEPTION 'exam_unknown_module: module % hors registre des examens', NEW.module_id
      USING ERRCODE = 'P0451';
  END IF;

  v_declared := NEW.module_data->>'id';
  IF v_declared IS NULL OR lower(v_declared) <> lower(v_exam_id) THEN
    RAISE EXCEPTION 'exam_identity_mismatch: ecriture declaree "%" alors que le module correspond a "%"',
      coalesce(v_declared, 'null'), v_exam_id USING ERRCODE = 'P0452';
  END IF;

  v_version := NEW.module_data->>'editorSchemaVersion';
  IF coalesce(v_version, '') <> public.exam_editor_required_schema_version() THEN
    RAISE EXCEPTION 'exam_editor_outdated: Cette page d''administration est obsolete. Rechargez-la avant de modifier les examens.'
      USING ERRCODE = 'P0453';
  END IF;

  v_origine := NEW.module_data->>'writeOrigin';
  IF coalesce(v_origine, '') NOT IN ('manuel', 'autosave', 'synchronisation', 'restauration') THEN
    RAISE EXCEPTION 'exam_write_origin_missing: origine d''ecriture absente ou invalide (%)', coalesce(v_origine, 'null')
      USING ERRCODE = 'P0454';
  END IF;

  IF jsonb_typeof(coalesce(NEW.module_data->'matieres', 'null'::jsonb)) <> 'array'
     OR jsonb_array_length(NEW.module_data->'matieres') = 0 THEN
    RAISE EXCEPTION 'exam_identity_incomplete: aucune matiere dans l''ecriture de %', v_exam_id
      USING ERRCODE = 'P0455';
  END IF;

  FOR v_mat IN SELECT value FROM jsonb_array_elements(NEW.module_data->'matieres') LOOP
    IF coalesce(v_mat->>'id', '') = '' THEN
      RAISE EXCEPTION 'exam_identity_incomplete: matiere sans identifiant dans %', v_exam_id
        USING ERRCODE = 'P0455';
    END IF;
    IF jsonb_typeof(coalesce(v_mat->'questions', 'null'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'exam_identity_incomplete: matiere sans liste de questions dans %', v_exam_id
        USING ERRCODE = 'P0455';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_mat->'questions') q
      WHERE coalesce(q->>'id', '') = ''
    ) THEN
      RAISE EXCEPTION 'exam_identity_incomplete: question sans identifiant stable dans %', v_exam_id
        USING ERRCODE = 'P0455';
    END IF;
  END LOOP;

  v_numero := public.exam_numero_from_id(v_exam_id);
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  FOR v_mat IN SELECT value FROM jsonb_array_elements(NEW.module_data->'matieres') LOOP
    v_sig := public.exam_matiere_signature(v_mat);
    v_old_mat := NULL;
    IF TG_OP = 'UPDATE'
       AND jsonb_typeof(coalesce(OLD.module_data->'matieres', 'null'::jsonb)) = 'array' THEN
      SELECT m INTO v_old_mat
      FROM jsonb_array_elements(OLD.module_data->'matieres') m
      WHERE m->>'id' = v_mat->>'id' LIMIT 1;
    END IF;
    v_old_sig := CASE WHEN v_old_mat IS NULL THEN NULL ELSE public.exam_matiere_signature(v_old_mat) END;

    IF v_old_sig IS NOT DISTINCT FROM v_sig THEN
      CONTINUE;
    END IF;

    IF v_numero IS NOT NULL THEN
      v_conflit := NULL;
      SELECT s.module_id AS module_id, public.exam_id_for_module(s.module_id) AS exam_id INTO v_conflit
      FROM public.module_editor_state s,
           LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(coalesce(s.module_data->'matieres', 'null'::jsonb)) = 'array'
                  THEN s.module_data->'matieres' ELSE '[]'::jsonb END) m
      WHERE s.module_id BETWEEN 90000 AND 90027
        AND s.module_id <> NEW.module_id
        AND m->>'id' = v_mat->>'id'
        AND public.exam_matiere_signature(m) = v_sig
        AND public.exam_numero_from_id(public.exam_id_for_module(s.module_id)) IS DISTINCT FROM v_numero
      LIMIT 1;

      IF v_conflit.module_id IS NOT NULL THEN
        INSERT INTO public.exam_content_write_log (
          module_id, exam_id, matiere_id, action, origine, statut, motif_refus,
          questions_avant, questions_apres, signature_avant, signature_apres,
          examen_source_suspecte, author_email, editor_schema_version)
        VALUES (
          NEW.module_id, v_exam_id, v_mat->>'id', 'ecriture_contenu', v_origine, 'refuse',
          'propagation interdite entre numeros d examens differents',
          CASE WHEN v_old_mat IS NULL THEN NULL ELSE jsonb_array_length(coalesce(v_old_mat->'questions', '[]'::jsonb)) END,
          jsonb_array_length(coalesce(v_mat->'questions', '[]'::jsonb)),
          v_old_sig, v_sig, v_conflit.exam_id, v_email, v_version);

        RAISE EXCEPTION 'exam_cross_number_propagation: matiere % identique a l examen % (numero different), ecriture sur % refusee',
          v_mat->>'id', v_conflit.exam_id, v_exam_id USING ERRCODE = 'P0456';
      END IF;
    END IF;

    INSERT INTO public.exam_content_write_log (
      module_id, exam_id, matiere_id, action, origine, statut,
      questions_avant, questions_apres, signature_avant, signature_apres,
      author_email, editor_schema_version)
    VALUES (
      NEW.module_id, v_exam_id, v_mat->>'id',
      CASE WHEN v_old_mat IS NULL THEN 'ajout_matiere' ELSE 'modification_matiere' END,
      v_origine, 'accepte',
      CASE WHEN v_old_mat IS NULL THEN NULL ELSE jsonb_array_length(coalesce(v_old_mat->'questions', '[]'::jsonb)) END,
      jsonb_array_length(coalesce(v_mat->'questions', '[]'::jsonb)),
      v_old_sig, v_sig, v_email, v_version);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_exam_content_integrity ON public.module_editor_state;
CREATE TRIGGER trg_enforce_exam_content_integrity
  BEFORE INSERT OR UPDATE ON public.module_editor_state
  FOR EACH ROW EXECUTE FUNCTION public.enforce_exam_content_integrity();