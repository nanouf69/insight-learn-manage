-- Comptes TEST du raccordement : le serveur seul decide si une tentative est
-- une tentative de test. Le navigateur ne peut pas se declarer "test".
CREATE TABLE IF NOT EXISTS public.core_bridge_comptes_test (
  apprenant_id uuid PRIMARY KEY,
  libelle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_email text
);

GRANT SELECT ON public.core_bridge_comptes_test TO authenticated;
GRANT ALL ON public.core_bridge_comptes_test TO service_role;
ALTER TABLE public.core_bridge_comptes_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des comptes test du pont" ON public.core_bridge_comptes_test;
CREATE POLICY "Lecture des comptes test du pont"
  ON public.core_bridge_comptes_test FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gere les comptes test du pont" ON public.core_bridge_comptes_test;
CREATE POLICY "Admin gere les comptes test du pont"
  ON public.core_bridge_comptes_test FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.core_bridge_compte_test(p_apprenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.core_bridge_comptes_test WHERE apprenant_id = p_apprenant_id);
$$;

-- Le pont est-il utilisable pour CET apprenant ? (serveur seul juge)
CREATE OR REPLACE FUNCTION public.core_bridge_actif_pour(p_apprenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.core_bridge_actif(public.core_bridge_compte_test(p_apprenant_id));
$$;

-- Demarrage de tentative : is_test derive du serveur, version publiee commune
-- (les comptes TEST passent exactement le meme contenu que les apprenants).
CREATE OR REPLACE FUNCTION public.core_start_attempt(
  p_operation_id uuid,
  p_apprenant_id uuid,
  p_exam_id text,
  p_matiere text,
  p_is_test boolean DEFAULT false
)
RETURNS public.exam_attempts_v2
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  v_test boolean;
  v_version public.exam_content_versions;
  v_questions jsonb;
  v_matieres jsonb;
  v_snapshot jsonb;
  v_att public.exam_attempts_v2;
BEGIN
  v_test := public.core_bridge_compte_test(p_apprenant_id);

  IF NOT public.core_bridge_actif(v_test) THEN
    RAISE EXCEPTION 'PONT_V2_INACTIF: le raccordement des passages au noyau n''est pas active (test=%).', v_test
      USING ERRCODE = 'P0483';
  END IF;

  IF NOT (public.core_est_proprietaire(p_apprenant_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'TENTATIVE_REFUSEE: impossible de demarrer la tentative d''un autre apprenant.'
      USING ERRCODE = 'P0484';
  END IF;

  rejeu := public.core_operation_replay(p_operation_id, 'attempt_start');
  IF rejeu IS NOT NULL THEN
    SELECT * INTO v_att FROM public.exam_attempts_v2 WHERE attempt_id = (rejeu #>> '{resultat,attempt_id}')::uuid;
    RETURN v_att;
  END IF;

  SELECT * INTO v_att FROM public.exam_attempts_v2
   WHERE apprenant_id = p_apprenant_id
     AND exam_id = p_exam_id
     AND etat = 'en_cours'
     AND snapshot->>'matiere' = p_matiere
   ORDER BY started_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN v_att;
  END IF;

  SELECT * INTO v_version FROM public.exam_content_versions
   WHERE exam_id = p_exam_id AND statut = 'publiee' AND retired_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_ABSENTE: aucune version publiee pour l''examen %.', p_exam_id USING ERRCODE = 'P0485';
  END IF;

  SELECT jsonb_agg(q ORDER BY ord) INTO v_questions
    FROM (
      SELECT value AS q, ordinality AS ord
        FROM jsonb_array_elements(v_version.content->'questions') WITH ORDINALITY AS t(value, ordinality)
       WHERE value->>'matiere' = p_matiere
    ) s;

  IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
    RAISE EXCEPTION 'MATIERE_ABSENTE: la matiere % ne figure pas dans la version publiee de %.', p_matiere, p_exam_id
      USING ERRCODE = 'P0487';
  END IF;

  SELECT jsonb_agg(m) INTO v_matieres
    FROM jsonb_array_elements(coalesce(v_version.content->'matieres', '[]'::jsonb)) m
   WHERE m->>'subject_id' = p_matiere;

  v_snapshot := jsonb_build_object(
    'exam_id', p_exam_id,
    'exam_libelle', v_version.content->>'exam_libelle',
    'filiere', v_version.filiere,
    'exam_numero', v_version.exam_numero,
    'matiere', p_matiere,
    'matieres', coalesce(v_matieres, '[]'::jsonb),
    'questions', v_questions
  );

  INSERT INTO public.exam_attempts_v2
    (apprenant_id, exam_id, exam_version_id, snapshot, snapshot_fingerprint, etat, is_test)
  VALUES
    (p_apprenant_id, p_exam_id, v_version.id, v_snapshot, md5(v_snapshot::text), 'en_cours', v_test)
  RETURNING * INTO v_att;

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'attempt_start', p_apprenant_id, v_att.attempt_id, auth.uid(),
          jsonb_build_object('exam_id', p_exam_id, 'matiere', p_matiere),
          jsonb_build_object('attempt_id', v_att.attempt_id, 'snapshot_fingerprint', v_att.snapshot_fingerprint));

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('attempt_start', 'exam_attempts_v2', v_att.attempt_id::text, p_exam_id, v_version.id, v_att.attempt_id,
          p_apprenant_id, auth.uid(),
          jsonb_build_object('matiere', p_matiere, 'snapshot_fingerprint', v_att.snapshot_fingerprint, 'is_test', v_test),
          'core_start_attempt');

  RETURN v_att;
END;
$$;
