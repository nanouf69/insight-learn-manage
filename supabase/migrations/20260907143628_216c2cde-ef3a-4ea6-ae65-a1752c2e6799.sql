CREATE TABLE public.quiz_question_sets (
  quiz_id text PRIMARY KEY,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_question_sets TO authenticated;
GRANT ALL ON public.quiz_question_sets TO service_role;
ALTER TABLE public.quiz_question_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read canonical quiz sets"
  ON public.quiz_question_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage canonical quiz sets"
  ON public.quiz_question_sets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.quiz_question_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id text NOT NULL REFERENCES public.quiz_question_sets(quiz_id) ON DELETE CASCADE,
  module_id integer NOT NULL,
  exercise_id bigint NOT NULL,
  section_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, module_id, exercise_id),
  UNIQUE (module_id, exercise_id, quiz_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_question_bindings TO authenticated;
GRANT ALL ON public.quiz_question_bindings TO service_role;
ALTER TABLE public.quiz_question_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read canonical quiz bindings"
  ON public.quiz_question_bindings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage canonical quiz bindings"
  ON public.quiz_question_bindings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.quiz_questions (
  question_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id text NOT NULL REFERENCES public.quiz_question_sets(quiz_id) ON DELETE CASCADE,
  section_id bigint NOT NULL,
  legacy_question_id bigint NOT NULL,
  position integer NOT NULL DEFAULT 0,
  enonce text NOT NULL,
  choix jsonb NOT NULL DEFAULT '[]'::jsonb,
  image text,
  image_size text,
  explication text,
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'migration',
  updated_by_fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, section_id, legacy_question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read canonical quiz questions"
  ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage canonical quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX quiz_questions_quiz_section_position_idx
  ON public.quiz_questions(quiz_id, section_id, position);
CREATE INDEX quiz_question_bindings_module_exercise_idx
  ON public.quiz_question_bindings(module_id, exercise_id);

CREATE TABLE public.quiz_question_migration_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id text NOT NULL,
  section_id bigint NOT NULL,
  legacy_question_id bigint NOT NULL,
  canonical_question_id uuid REFERENCES public.quiz_questions(question_id) ON DELETE SET NULL,
  source_kind text NOT NULL,
  source_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at timestamptz NOT NULL,
  was_selected boolean NOT NULL DEFAULT false,
  content_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_question_migration_audit TO authenticated;
GRANT ALL ON public.quiz_question_migration_audit TO service_role;
ALTER TABLE public.quiz_question_migration_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read canonical migration audit"
  ON public.quiz_question_migration_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage canonical migration audit"
  ON public.quiz_question_migration_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.quiz_question_sets(quiz_id, label) VALUES
  ('reglementation-nationale', 'Réglementation nationale'),
  ('reglementation-locale', 'Réglementation locale'),
  ('connaissance-ville', 'Connaissance de la ville'),
  ('equipements-taxi', 'Équipements TAXI'),
  ('cas-pratique-taxi', 'Cas pratique TAXI'),
  ('controle-connaissances-taxi', 'Contrôle de connaissances TAXI'),
  ('bilan-exercices-taxi', 'Bilan exercices TAXI'),
  ('bilan-exercices-ta', 'Bilan exercices TA'),
  ('bilan-examen-taxi', 'Bilan examen TAXI'),
  ('bilan-examen-ta', 'Bilan examen TA')
ON CONFLICT (quiz_id) DO NOTHING;

INSERT INTO public.quiz_question_bindings(quiz_id, module_id, exercise_id, section_id) VALUES
  ('reglementation-nationale',10,70,70),('reglementation-nationale',10,71,71),
  ('reglementation-nationale',24,70,70),('reglementation-nationale',24,71,71),
  ('reglementation-nationale',40,70,70),('reglementation-nationale',40,71,71),
  ('reglementation-locale',10,73,73),('reglementation-locale',10,74,74),('reglementation-locale',10,75,75),('reglementation-locale',10,76,76),
  ('reglementation-locale',24,73,73),('reglementation-locale',24,74,74),('reglementation-locale',24,75,75),('reglementation-locale',24,76,76),
  ('reglementation-locale',40,73,73),('reglementation-locale',40,74,74),('reglementation-locale',40,75,75),('reglementation-locale',40,76,76),
  ('reglementation-locale',42,73,73),('reglementation-locale',42,74,74),('reglementation-locale',42,75,75),('reglementation-locale',42,76,76),
  ('connaissance-ville',7,7001,7001),('connaissance-ville',7,7002,7002),('connaissance-ville',7,7003,7003),('connaissance-ville',7,7004,7004),('connaissance-ville',7,7005,7005),('connaissance-ville',7,7006,7006),
  ('equipements-taxi',64,64100,64100),
  ('cas-pratique-taxi',12,300,300),('cas-pratique-taxi',12,301,301),('cas-pratique-taxi',12,302,302),('cas-pratique-taxi',12,303,303),('cas-pratique-taxi',12,304,304),('cas-pratique-taxi',12,305,305),('cas-pratique-taxi',12,306,306),('cas-pratique-taxi',12,307,307),('cas-pratique-taxi',12,308,308),('cas-pratique-taxi',12,309,309),('cas-pratique-taxi',12,310,310),
  ('controle-connaissances-taxi',13,1,1),('controle-connaissances-taxi',13,2,2),('controle-connaissances-taxi',13,3,3),('controle-connaissances-taxi',13,4,4),('controle-connaissances-taxi',13,5,5),
  ('bilan-exercices-taxi',9,203,203),('bilan-exercices-taxi',9,204,204),
  ('bilan-exercices-ta',27,70,70),('bilan-exercices-ta',27,71,71),('bilan-exercices-ta',27,73,73),('bilan-exercices-ta',27,74,74),('bilan-exercices-ta',27,75,75),('bilan-exercices-ta',27,76,76),
  ('bilan-examen-taxi',11,600,600),('bilan-examen-taxi',11,601,601),('bilan-examen-taxi',11,602,602),('bilan-examen-taxi',11,603,603),('bilan-examen-taxi',11,604,604),('bilan-examen-taxi',11,605,605),('bilan-examen-taxi',11,606,606),
  ('bilan-examen-ta',28,700,700),('bilan-examen-ta',28,701,701)
ON CONFLICT DO NOTHING;

WITH module_candidates AS (
  SELECT b.quiz_id, b.section_id, (q.value->>'id')::bigint AS legacy_question_id,
         q.ordinality::integer AS position,
         q.value->>'enonce' AS enonce,
         COALESCE(q.value->'choix','[]'::jsonb) AS choix,
         q.value->>'image' AS image,
         q.value->>'imageSize' AS image_size,
         q.value->>'explication' AS explication,
         COALESCE(NULLIF(q.value->>'_editedAt','')::timestamptz, mes.updated_at) AS candidate_updated_at,
         'module'::text AS source_kind,
         jsonb_build_object('module_id',mes.module_id,'exercise_id',b.exercise_id) AS source_reference
  FROM public.quiz_question_bindings b
  JOIN public.module_editor_state mes ON mes.module_id=b.module_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mes.module_data->'exercices','[]'::jsonb)) e(value)
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.value->'questions','[]'::jsonb)) WITH ORDINALITY q(value,ordinality)
  WHERE (e.value->>'id')::bigint=b.exercise_id AND q.value ? 'id'
), override_candidates AS (
  SELECT o.quiz_id, o.section_id::bigint, o.question_id::bigint AS legacy_question_id,
         o.question_id AS position, o.enonce, o.choix, NULL::text AS image,
         NULL::text AS image_size, NULL::text AS explication, o.updated_at AS candidate_updated_at,
         'fournisseur'::text AS source_kind,
         jsonb_build_object('override_id',o.id,'fournisseur_id',o.fournisseur_id) AS source_reference
  FROM public.quiz_questions_overrides o
  WHERE o.quiz_id NOT LIKE 'archived:%' AND EXISTS (SELECT 1 FROM public.quiz_question_sets s WHERE s.quiz_id=o.quiz_id)
), candidates AS (
  SELECT * FROM module_candidates UNION ALL SELECT * FROM override_candidates
), ranked AS (
  SELECT c.*, row_number() OVER (
    PARTITION BY quiz_id,section_id,legacy_question_id
    ORDER BY candidate_updated_at DESC, CASE source_kind WHEN 'fournisseur' THEN 1 ELSE 0 END DESC, source_reference::text DESC
  ) AS winner_rank
  FROM candidates c
), inserted AS (
  INSERT INTO public.quiz_questions(quiz_id,section_id,legacy_question_id,position,enonce,choix,image,image_size,explication,active,source,updated_by_fournisseur_id,updated_at)
  SELECT quiz_id,section_id,legacy_question_id,position,
         CASE WHEN enonce='__DELETED__' THEN '' ELSE enonce END,
         CASE WHEN enonce='__DELETED__' THEN '[]'::jsonb ELSE choix END,
         image,image_size,explication,enonce<>'__DELETED__',source_kind,
         CASE WHEN source_kind='fournisseur' THEN NULLIF(source_reference->>'fournisseur_id','')::uuid ELSE NULL END,
         candidate_updated_at
  FROM ranked WHERE winner_rank=1
  ON CONFLICT (quiz_id,section_id,legacy_question_id) DO UPDATE SET
    position=EXCLUDED.position,enonce=EXCLUDED.enonce,choix=EXCLUDED.choix,image=EXCLUDED.image,
    image_size=EXCLUDED.image_size,explication=EXCLUDED.explication,active=EXCLUDED.active,
    source=EXCLUDED.source,updated_by_fournisseur_id=EXCLUDED.updated_by_fournisseur_id,updated_at=EXCLUDED.updated_at
  RETURNING question_id,quiz_id,section_id,legacy_question_id
)
INSERT INTO public.quiz_question_migration_audit(quiz_id,section_id,legacy_question_id,canonical_question_id,source_kind,source_reference,source_updated_at,was_selected,content_fingerprint)
SELECT r.quiz_id,r.section_id,r.legacy_question_id,q.question_id,r.source_kind,r.source_reference,r.candidate_updated_at,r.winner_rank=1,
       md5(COALESCE(r.enonce,'')||COALESCE(r.choix::text,''))
FROM ranked r JOIN public.quiz_questions q USING(quiz_id,section_id,legacy_question_id);

CREATE OR REPLACE FUNCTION public.touch_quiz_question_set()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  UPDATE public.quiz_question_sets SET updated_at=NEW.updated_at WHERE quiz_id=NEW.quiz_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_touch_quiz_question_set
AFTER INSERT OR UPDATE ON public.quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.touch_quiz_question_set();

CREATE OR REPLACE FUNCTION public.get_canonical_quiz_questions(p_quiz_id text, p_fournisseur_token text)
RETURNS SETOF public.quiz_questions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT q.* FROM public.quiz_questions q
  WHERE q.quiz_id=p_quiz_id
    AND EXISTS (SELECT 1 FROM public.fournisseurs f WHERE f.token=p_fournisseur_token AND f.actif=true)
  ORDER BY q.section_id,q.position,q.legacy_question_id;
$$;
REVOKE ALL ON FUNCTION public.get_canonical_quiz_questions(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_canonical_quiz_questions(text,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.save_canonical_quiz_question(
  p_fournisseur_token text,
  p_quiz_id text,
  p_section_id bigint,
  p_legacy_question_id bigint,
  p_position integer,
  p_enonce text,
  p_choix jsonb,
  p_image text DEFAULT NULL,
  p_image_size text DEFAULT NULL,
  p_explication text DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS public.quiz_questions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_fournisseur_id uuid; v_row public.quiz_questions;
BEGIN
  SELECT id INTO v_fournisseur_id FROM public.fournisseurs
  WHERE token=p_fournisseur_token AND actif=true;
  IF v_fournisseur_id IS NULL THEN RAISE EXCEPTION 'invalid_fournisseur_token' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quiz_question_sets WHERE quiz_id=p_quiz_id) THEN
    RAISE EXCEPTION 'unknown_quiz_id' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.quiz_questions(quiz_id,section_id,legacy_question_id,position,enonce,choix,image,image_size,explication,active,source,updated_by_fournisseur_id,updated_at)
  VALUES(p_quiz_id,p_section_id,p_legacy_question_id,p_position,p_enonce,COALESCE(p_choix,'[]'::jsonb),p_image,p_image_size,p_explication,p_active,'fournisseur',v_fournisseur_id,clock_timestamp())
  ON CONFLICT (quiz_id,section_id,legacy_question_id) DO UPDATE SET
    position=EXCLUDED.position,enonce=EXCLUDED.enonce,choix=EXCLUDED.choix,image=EXCLUDED.image,
    image_size=EXCLUDED.image_size,explication=EXCLUDED.explication,active=EXCLUDED.active,
    source='fournisseur',updated_by_fournisseur_id=v_fournisseur_id,updated_at=clock_timestamp()
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.save_canonical_quiz_question(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_canonical_quiz_question(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.sync_admin_canonical_quiz_questions(p_module_id integer, p_exercises jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b record; ex jsonb; q jsonb; q_ids bigint[]; pos integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501'; END IF;
  FOR b IN SELECT * FROM public.quiz_question_bindings WHERE module_id=p_module_id LOOP
    SELECT value INTO ex FROM jsonb_array_elements(COALESCE(p_exercises,'[]'::jsonb)) WHERE (value->>'id')::bigint=b.exercise_id LIMIT 1;
    IF ex IS NULL THEN CONTINUE; END IF;
    q_ids := ARRAY[]::bigint[]; pos := 0;
    FOR q IN SELECT value FROM jsonb_array_elements(COALESCE(ex->'questions','[]'::jsonb)) LOOP
      IF NOT (q ? 'id') THEN CONTINUE; END IF;
      pos := pos+1; q_ids := array_append(q_ids,(q->>'id')::bigint);
      INSERT INTO public.quiz_questions(quiz_id,section_id,legacy_question_id,position,enonce,choix,image,image_size,explication,active,source,updated_by_fournisseur_id,updated_at)
      VALUES(b.quiz_id,b.section_id,(q->>'id')::bigint,pos,COALESCE(q->>'enonce',''),COALESCE(q->'choix','[]'::jsonb),q->>'image',q->>'imageSize',q->>'explication',true,'admin',NULL,clock_timestamp())
      ON CONFLICT (quiz_id,section_id,legacy_question_id) DO UPDATE SET
        position=EXCLUDED.position,enonce=EXCLUDED.enonce,choix=EXCLUDED.choix,image=EXCLUDED.image,
        image_size=EXCLUDED.image_size,explication=EXCLUDED.explication,active=true,source='admin',
        updated_by_fournisseur_id=NULL,updated_at=clock_timestamp();
    END LOOP;
    UPDATE public.quiz_questions SET active=false,source='admin',updated_by_fournisseur_id=NULL,updated_at=clock_timestamp()
    WHERE quiz_id=b.quiz_id AND section_id=b.section_id AND active=true
      AND NOT (legacy_question_id=ANY(q_ids));
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.sync_admin_canonical_quiz_questions(integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_admin_canonical_quiz_questions(integer,jsonb) TO authenticated,service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_question_sets;