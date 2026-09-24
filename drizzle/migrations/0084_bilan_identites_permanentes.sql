CREATE TABLE public.bilan_question_identites (
  uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id int NOT NULL,
  filiere text NOT NULL,
  exercice_id int NOT NULL,
  matiere text,
  numero_technique text NOT NULL,
  empreinte_contenu text,
  etat_initial text NOT NULL DEFAULT 'actif' CHECK (etat_initial IN ('actif','masque','supprime','litigieux')),
  litigieux boolean NOT NULL DEFAULT false,
  motif text,
  date_connue timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, exercice_id, numero_technique)
);
GRANT SELECT ON public.bilan_question_identites TO authenticated;
GRANT ALL ON public.bilan_question_identites TO service_role;
ALTER TABLE public.bilan_question_identites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit identites bilan" ON public.bilan_question_identites FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.bilan_question_identite_etats (
  id bigserial PRIMARY KEY,
  uid uuid NOT NULL REFERENCES public.bilan_question_identites(uid),
  etat text NOT NULL CHECK (etat IN ('actif','masque','supprime','litigieux')),
  numero_affiche text,
  empreinte_contenu text,
  motif text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bilan_question_identite_etats TO authenticated;
GRANT ALL ON public.bilan_question_identite_etats TO service_role;
ALTER TABLE public.bilan_question_identite_etats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit etats identites bilan" ON public.bilan_question_identite_etats FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.bilan_identite_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Registre des identités Bilan : % interdit (append-only).', TG_OP USING ERRCODE = 'P0496';
END $$;
CREATE TRIGGER trg_bilan_identites_append_only BEFORE UPDATE OR DELETE ON public.bilan_question_identites FOR EACH ROW EXECUTE FUNCTION public.bilan_identite_append_only();
CREATE TRIGGER trg_bilan_identites_no_truncate BEFORE TRUNCATE ON public.bilan_question_identites FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_identite_append_only();
CREATE TRIGGER trg_bilan_identite_etats_append_only BEFORE UPDATE OR DELETE ON public.bilan_question_identite_etats FOR EACH ROW EXECUTE FUNCTION public.bilan_identite_append_only();
CREATE TRIGGER trg_bilan_identite_etats_no_truncate BEFORE TRUNCATE ON public.bilan_question_identite_etats FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_identite_append_only();

CREATE TABLE public.bilan_identite_flags (
  module_id int PRIMARY KEY,
  actif boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bilan_identite_flags TO authenticated;
GRANT ALL ON public.bilan_identite_flags TO service_role;
ALTER TABLE public.bilan_identite_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture flags identites" ON public.bilan_identite_flags FOR SELECT TO authenticated USING (true);
INSERT INTO public.bilan_identite_flags(module_id, actif) VALUES (5,false),(11,false);

-- Création d'une identité pour une NOUVELLE question : numéro technique = identifiant permanent (jamais max+1).
CREATE OR REPLACE FUNCTION public.bilan_identite_creer(p_module_id int, p_exercice_id int, p_question jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := gen_random_uuid();
BEGIN
  INSERT INTO bilan_question_identites(uid, module_id, filiere, exercice_id, numero_technique, empreinte_contenu, etat_initial, date_connue)
  VALUES (v, p_module_id, CASE p_module_id WHEN 5 THEN 'VTC' WHEN 11 THEN 'TAXI' ELSE 'TEST' END, p_exercice_id,
          'uid:'||v::text, md5(COALESCE(p_question - 'uid' - 'id','{}'::jsonb)::text), 'actif', now());
  INSERT INTO bilan_question_identite_etats(uid, etat, numero_affiche, empreinte_contenu, motif)
  VALUES (v, 'actif', p_question->>'id', md5(COALESCE(p_question - 'uid' - 'id','{}'::jsonb)::text), 'création');
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.bilan_identite_creer(int,int,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bilan_identite_creer(int,int,jsonb) TO service_role;

-- Garde-fou (actif seulement si le flag du module est activé) :
-- chaque question doit porter un uid enregistré pour ce module/matière ;
-- un uid ne peut apparaître qu'une fois ; un uid litigieux ne peut jamais redevenir actif ;
-- un numéro historique (legacy) ne peut pas être porté par une autre identité que la sienne.
CREATE OR REPLACE FUNCTION public.bilan_identite_garde()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_bad text;
BEGIN
  IF NOT COALESCE((SELECT actif FROM bilan_identite_flags WHERE module_id = NEW.module_id), false) THEN RETURN NEW; END IF;
  WITH q AS (
    SELECT (e->>'id')::int ex, x->>'id' num, x->>'uid' uid
    FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(COALESCE(e->'questions','[]'::jsonb)) x)
  SELECT string_agg(motif, ' ; ') INTO v_bad FROM (
    SELECT 'question sans identifiant permanent ('||ex||'-'||num||')' motif FROM q WHERE uid IS NULL
    UNION ALL SELECT 'identifiant inconnu ou d''une autre matière ('||ex||'-'||num||')' FROM q
      WHERE uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bilan_question_identites i WHERE i.uid::text = q.uid AND i.module_id = NEW.module_id AND i.exercice_id = q.ex)
    UNION ALL SELECT 'identifiant en double ('||uid||')' FROM q WHERE uid IS NOT NULL GROUP BY uid HAVING count(*) > 1
    UNION ALL SELECT 'identité litigieuse réactivée ('||ex||'-'||num||')' FROM q JOIN bilan_question_identites i ON i.uid::text = q.uid WHERE i.litigieux
    UNION ALL SELECT 'numéro historique '||q.ex||'-'||q.num||' réattribué à une autre identité' FROM q
      JOIN bilan_question_identites i ON i.module_id = NEW.module_id AND i.exercice_id = q.ex AND i.numero_technique = q.num
      WHERE q.uid IS DISTINCT FROM i.uid::text
  ) z;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Identités de questions Bilan : %. Aucune modification enregistrée.', v_bad USING ERRCODE = 'P0497';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bilan_identite_garde BEFORE INSERT OR UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW EXECUTE FUNCTION public.bilan_identite_garde();

-- Rattachement d'une réponse à une identité : refus si la clé historique est litigieuse ou appartient à une autre identité.
CREATE OR REPLACE FUNCTION public.bilan_reponse_identite_valide(p_module_id int, p_exercice_id int, p_cle_historique text, p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_cle_historique IS NULL THEN EXISTS (SELECT 1 FROM bilan_question_identites WHERE uid = p_uid AND NOT litigieux)
    ELSE EXISTS (SELECT 1 FROM bilan_question_identites
                 WHERE module_id = p_module_id AND exercice_id = p_exercice_id
                   AND numero_technique = split_part(p_cle_historique, '-', 2)
                   AND uid = p_uid AND NOT litigieux)
  END
$$;
GRANT EXECUTE ON FUNCTION public.bilan_reponse_identite_valide(int,int,text,uuid) TO authenticated, service_role;

-- Correction QCM à partir du snapshot, par identifiant permanent.
CREATE OR REPLACE FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH q AS (
    SELECT x->>'uid' uid, x->'choix' choix FROM bilan_passage_snapshots s, jsonb_array_elements(s.questions) x
    WHERE s.id = p_snapshot_id AND x->>'type' = 'QCM' AND x->>'uid' IS NOT NULL),
  c AS (
    SELECT q.uid,
      (SELECT COALESCE(array_agg(ch->>'lettre' ORDER BY ch->>'lettre'), '{}') FROM jsonb_array_elements(q.choix) ch WHERE (ch->>'correct')::boolean) bonnes,
      (SELECT COALESCE(array_agg(v ORDER BY v), '{}') FROM jsonb_array_elements_text(COALESCE(p_reponses->q.uid,'[]'::jsonb)) v) donnees
    FROM q)
  SELECT jsonb_build_object('bonnes', count(*) FILTER (WHERE bonnes = donnees AND cardinality(donnees) > 0), 'total', count(*),
    'reponses_hors_snapshot', (SELECT count(*) FROM jsonb_object_keys(p_reponses) k WHERE k NOT IN (SELECT uid FROM q)))
  FROM c
$$;
GRANT EXECUTE ON FUNCTION public.bilan_corriger_snapshot(uuid,jsonb) TO authenticated, service_role;