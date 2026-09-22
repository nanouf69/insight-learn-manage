-- ============================================================================
-- RACCORDEMENT DES NOUVEAUX PASSAGES AU NOYAU V2
-- Additif uniquement. Aucune donnée existante n'est lue, modifiée ou supprimée.
-- Aucun apprenant réel n'est branché : l'activation est pilotée par un drapeau
-- serveur, désactivé par défaut pour les passages réels.
-- ============================================================================

-- 1) DRAPEAUX D'ACTIVATION (serveur seul juge)
CREATE TABLE IF NOT EXISTS public.core_bridge_flags (
  cle text PRIMARY KEY,
  actif boolean NOT NULL DEFAULT false,
  motif text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_email text
);

GRANT SELECT ON public.core_bridge_flags TO authenticated;
GRANT ALL ON public.core_bridge_flags TO service_role;
ALTER TABLE public.core_bridge_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des drapeaux du pont" ON public.core_bridge_flags;
CREATE POLICY "Lecture des drapeaux du pont"
  ON public.core_bridge_flags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin modifie les drapeaux du pont" ON public.core_bridge_flags;
CREATE POLICY "Admin modifie les drapeaux du pont"
  ON public.core_bridge_flags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.core_bridge_flags (cle, actif, motif)
VALUES
  ('passage_v2_comptes_test', true,  'Raccordement actif pour les comptes TEST uniquement'),
  ('passage_v2_apprenants_reels', false, 'Desactive tant que le test complet EB3 n''est pas valide')
ON CONFLICT (cle) DO NOTHING;

CREATE OR REPLACE FUNCTION public.core_bridge_actif(p_is_test boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT actif FROM public.core_bridge_flags
                   WHERE cle = CASE WHEN p_is_test THEN 'passage_v2_comptes_test'
                                    ELSE 'passage_v2_apprenants_reels' END), false);
$$;

-- 2) PUBLICATION D'UNE VERSION À PARTIR DU CONTENU RÉELLEMENT SERVI
--    Le contenu est fourni tel quel (mêmes questions, mêmes barèmes que ceux
--    présentés à l'apprenant). La fonction ne devine rien et ne fusionne rien.
CREATE OR REPLACE FUNCTION public.core_publish_version_contenu(
  p_operation_id uuid,
  p_filiere text,
  p_exam_numero text,
  p_module_id integer,
  p_exam_id text,
  p_content jsonb,
  p_email text DEFAULT NULL,
  p_is_test boolean DEFAULT false
)
RETURNS public.exam_content_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rejeu jsonb;
  v_fingerprint text;
  v_active public.exam_content_versions;
  v_num integer;
  v_row public.exam_content_versions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'PUBLICATION_REFUSEE: action reservee a un administrateur.' USING ERRCODE = 'P0481';
  END IF;

  rejeu := public.core_operation_replay(p_operation_id, 'exam_version_publish_contenu');
  IF rejeu IS NOT NULL THEN
    SELECT * INTO v_row FROM public.exam_content_versions WHERE id = (rejeu #>> '{resultat,version_id}')::uuid;
    RETURN v_row;
  END IF;

  IF p_content IS NULL OR jsonb_typeof(p_content->'questions') <> 'array'
     OR jsonb_array_length(p_content->'questions') = 0 THEN
    RAISE EXCEPTION 'CONTENU_INVALIDE: aucune question fournie pour %.', p_exam_id USING ERRCODE = 'P0482';
  END IF;

  v_fingerprint := md5(p_content::text);

  SELECT * INTO v_active FROM public.exam_content_versions
   WHERE exam_id = p_exam_id AND statut = 'publiee' AND retired_at IS NULL;

  IF FOUND AND v_active.fingerprint = v_fingerprint THEN
    RETURN v_active;  -- contenu identique : rien a republier
  END IF;

  IF FOUND THEN
    UPDATE public.exam_content_versions SET statut = 'retiree', retired_at = now() WHERE id = v_active.id;
  END IF;

  SELECT coalesce(max(version_number), 0) + 1 INTO v_num
    FROM public.exam_content_versions WHERE exam_id = p_exam_id;

  INSERT INTO public.exam_content_versions
    (filiere, exam_numero, module_id, exam_id, version_number, statut, content, fingerprint,
     motif, created_by, created_email, published_by, published_email, published_at, is_test)
  VALUES
    (p_filiere, p_exam_numero, p_module_id, p_exam_id, v_num, 'publiee', p_content, v_fingerprint,
     'Publication du contenu actif pour le raccordement des passages au noyau V2',
     auth.uid(), p_email, auth.uid(), p_email, now(), p_is_test)
  RETURNING * INTO v_row;

  INSERT INTO public.core_operations (operation_id, operation_type, auteur, cible, resultat)
  VALUES (p_operation_id, 'exam_version_publish_contenu', auth.uid(),
          jsonb_build_object('exam_id', p_exam_id),
          jsonb_build_object('version_id', v_row.id, 'fingerprint', v_fingerprint, 'version_number', v_num));

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, auteur, apres, origine)
  VALUES ('exam_version_publish', 'exam_content_versions', v_row.id::text, p_exam_id, v_row.id, auth.uid(),
          jsonb_build_object('fingerprint', v_fingerprint, 'version_number', v_num, 'is_test', p_is_test),
          'core_publish_version_contenu');

  RETURN v_row;
END;
$$;

-- 3) DÉMARRAGE D'UNE TENTATIVE (snapshot figé, une seule tentative en cours)
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
  v_version public.exam_content_versions;
  v_questions jsonb;
  v_matieres jsonb;
  v_snapshot jsonb;
  v_att public.exam_attempts_v2;
BEGIN
  IF NOT public.core_bridge_actif(p_is_test) THEN
    RAISE EXCEPTION 'PONT_V2_INACTIF: le raccordement des passages au noyau n''est pas active (test=%).', p_is_test
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

  -- Une seule tentative en cours par (apprenant, examen, matiere) : jamais de doublon.
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

  IF p_is_test <> v_version.is_test THEN
    RAISE EXCEPTION 'VERSION_INCOMPATIBLE: version test=% pour une tentative test=%.', v_version.is_test, p_is_test
      USING ERRCODE = 'P0486';
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
    (p_apprenant_id, p_exam_id, v_version.id, v_snapshot, md5(v_snapshot::text), 'en_cours', p_is_test)
  RETURNING * INTO v_att;

  INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
  VALUES (p_operation_id, 'attempt_start', p_apprenant_id, v_att.attempt_id, auth.uid(),
          jsonb_build_object('exam_id', p_exam_id, 'matiere', p_matiere),
          jsonb_build_object('attempt_id', v_att.attempt_id, 'snapshot_fingerprint', v_att.snapshot_fingerprint));

  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, attempt_id, apprenant_id, auteur, apres, origine)
  VALUES ('attempt_start', 'exam_attempts_v2', v_att.attempt_id::text, p_exam_id, v_version.id, v_att.attempt_id,
          p_apprenant_id, auth.uid(),
          jsonb_build_object('matiere', p_matiere, 'snapshot_fingerprint', v_att.snapshot_fingerprint, 'is_test', p_is_test),
          'core_start_attempt');

  RETURN v_att;
END;
$$;

-- 4) MARQUAGE DE L'ANCIEN CIRCUIT (projection a sens unique)
--    Une ligne produite a partir du noyau V2 est identifiee comme telle : elle
--    n'est plus une source de verite, seulement une copie de lecture.
ALTER TABLE public.reponses_apprenants
  ADD COLUMN IF NOT EXISTS source_noyau text;

COMMENT ON COLUMN public.reponses_apprenants.source_noyau IS
  'NULL = ancien circuit (source de verite historique). "v2" = projection en lecture seule produite depuis le noyau V2 : ne jamais ecrire directement dedans.';
