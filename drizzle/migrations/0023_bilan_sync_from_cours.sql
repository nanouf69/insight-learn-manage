-- Sauvegarde technique de l'état des bilans avant synchronisation
CREATE TABLE IF NOT EXISTS public.bilan_sync_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer NOT NULL,
  label text NOT NULL,
  module_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bilan_sync_backups TO authenticated;
GRANT ALL ON public.bilan_sync_backups TO service_role;

ALTER TABLE public.bilan_sync_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bilan backups"
ON public.bilan_sync_backups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Journal des questions retirées des bilans (présentes uniquement dans le bilan)
CREATE TABLE IF NOT EXISTS public.bilan_sync_removed_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer NOT NULL,
  exercice_id text NOT NULL,
  exercice_titre text,
  question jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bilan_sync_removed_questions TO authenticated;
GRANT ALL ON public.bilan_sync_removed_questions TO service_role;

ALTER TABLE public.bilan_sync_removed_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bilan removed questions"
ON public.bilan_sync_removed_questions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Mapping Cours et exercices -> Bilan exercices
CREATE OR REPLACE FUNCTION public.bilan_sync_mapping()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '[
    {"src_module": 2, "dst_module": 4, "blocs": [
      {"bloc": "100", "sources": ["1","2"]},
      {"bloc": "101", "sources": ["60","61","62"]},
      {"bloc": "102", "sources": ["80","81","82"]},
      {"bloc": "103", "sources": ["50"]},
      {"bloc": "104", "sources": ["7"]},
      {"bloc": "105", "sources": ["3","4","5","6"]},
      {"bloc": "106", "sources": ["72"]}
    ]},
    {"src_module": 10, "dst_module": 9, "blocs": [
      {"bloc": "100", "sources": ["1","2"]},
      {"bloc": "101", "sources": ["60","61","62"]},
      {"bloc": "102", "sources": ["80","81","82"]},
      {"bloc": "103", "sources": ["50"]},
      {"bloc": "105", "sources": ["3","4","5","6"]},
      {"bloc": "203", "sources": ["70","71"]},
      {"bloc": "204", "sources": ["73","74","75","76"]}
    ]}
  ]'::jsonb;
$$;

-- Synchronisation d'un couple cours -> bilan
CREATE OR REPLACE FUNCTION public.sync_bilan_from_cours(_src_module integer, _dst_module integer, _log_removed boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_map jsonb;
  v_bloc jsonb;
  v_src text;
  v_part jsonb;
  v_questions jsonb;
  v_exos jsonb;
  v_total integer := 0;
BEGIN
  SELECT b FROM jsonb_array_elements(public.bilan_sync_mapping()) b
  WHERE (b->>'src_module')::int = _src_module AND (b->>'dst_module')::int = _dst_module
  INTO v_map;

  IF v_map IS NULL THEN
    RETURN 0;
  END IF;

  SELECT module_data->'exercices' INTO v_exos FROM public.module_editor_state WHERE module_id = _dst_module;
  IF v_exos IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_bloc IN SELECT * FROM jsonb_array_elements(v_map->'blocs') LOOP
    v_questions := '[]'::jsonb;

    FOR v_src IN SELECT jsonb_array_elements_text(v_bloc->'sources') LOOP
      SELECT coalesce(jsonb_agg(
               (qq.q - 'id')
               || jsonb_build_object(
                    'id', (v_src::int * 1000 + (qq.q->>'id')::int),
                    'source_module_id', _src_module,
                    'source_exercice_id', v_src,
                    'source_question_id', qq.q->>'id',
                    'synced_from_cours', true
                  )
               ORDER BY qq.idx), '[]'::jsonb)
      INTO v_part
      FROM public.module_editor_state m,
           jsonb_array_elements(m.module_data->'exercices') e,
           jsonb_array_elements(e->'questions') WITH ORDINALITY qq(q, idx)
      WHERE m.module_id = _src_module AND e->>'id' = v_src;

      v_questions := v_questions || coalesce(v_part, '[]'::jsonb);
    END LOOP;

    IF _log_removed THEN
      INSERT INTO public.bilan_sync_removed_questions (module_id, exercice_id, exercice_titre, question)
      SELECT _dst_module, v_bloc->>'bloc', e->>'titre', oldq.q
      FROM jsonb_array_elements(v_exos) e,
           jsonb_array_elements(e->'questions') oldq(q)
      WHERE e->>'id' = (v_bloc->>'bloc');
    END IF;

    SELECT jsonb_agg(
             CASE WHEN e.e->>'id' = (v_bloc->>'bloc')
                  THEN jsonb_set(e.e, '{questions}', v_questions)
                  ELSE e.e END
             ORDER BY e.idx)
    INTO v_exos
    FROM jsonb_array_elements(v_exos) WITH ORDINALITY e(e, idx);

    v_total := v_total + jsonb_array_length(v_questions);
  END LOOP;

  UPDATE public.module_editor_state
  SET module_data = jsonb_set(module_data, '{exercices}', v_exos),
      updated_at = now()
  WHERE module_id = _dst_module;

  RETURN v_total;
END;
$$;

-- Synchronisation permanente : toute écriture sur les cours (2/10) ou sur un bilan (4/9)
-- ramène le bilan au contenu exact des cours.
CREATE OR REPLACE FUNCTION public.trg_sync_bilans_from_cours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.module_id = 2 OR NEW.module_id = 4 THEN
    PERFORM public.sync_bilan_from_cours(2, 4, false);
  ELSIF NEW.module_id = 10 OR NEW.module_id = 9 THEN
    PERFORM public.sync_bilan_from_cours(10, 9, false);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_module_editor_state_sync_bilans ON public.module_editor_state;

CREATE TRIGGER trg_module_editor_state_sync_bilans
AFTER INSERT OR UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW
WHEN (NEW.module_id IN (2, 4, 9, 10))
EXECUTE FUNCTION public.trg_sync_bilans_from_cours();