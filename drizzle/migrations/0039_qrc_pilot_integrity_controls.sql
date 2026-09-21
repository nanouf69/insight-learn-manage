-- Contrôle automatique du pilote QRC (lecture seule) + coupure du drapeau.
-- Aucune donnée existante n'est lue en écriture, modifiée ni supprimée.

CREATE OR REPLACE FUNCTION public.qrc_pilot_integrity(p_quiz_id text)
RETURNS TABLE (
  passages bigint,
  qrc_repondues bigint,
  ids_crees bigint,
  en_attente bigint,
  corrigees bigint,
  doublons bigint,
  manquantes bigint,
  corrections_perdues bigint,
  anomalie boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT * FROM public.qrc_instances WHERE quiz_id = p_quiz_id
  ), agg AS (
    SELECT
      (SELECT count(DISTINCT attempt_id) FROM base) AS passages,
      (SELECT count(*) FROM base WHERE btrim(coalesce(reponse_eleve, '')) <> '') AS qrc_repondues,
      (SELECT count(DISTINCT id) FROM base) AS ids_crees,
      (SELECT count(*) FROM base WHERE etat = 'en_attente') AS en_attente,
      (SELECT count(*) FROM base WHERE etat = 'corrigee') AS corrigees,
      (SELECT count(*) - count(DISTINCT (attempt_id::text || '|' || matiere_id || '|' || question_id)) FROM base) AS doublons,
      (SELECT count(*) FROM base WHERE btrim(coalesce(reponse_eleve, '')) = '') AS manquantes,
      (SELECT count(*) FROM base WHERE etat = 'corrigee' AND points_obtenus IS NULL) AS corrections_perdues
  )
  SELECT
    passages, qrc_repondues, ids_crees, en_attente, corrigees, doublons, manquantes, corrections_perdues,
    (doublons <> 0
      OR corrections_perdues <> 0
      OR ids_crees <> (en_attente + corrigees)
      OR qrc_repondues <> (ids_crees - manquantes)) AS anomalie
  FROM agg;
$$;

GRANT EXECUTE ON FUNCTION public.qrc_pilot_integrity(text) TO authenticated, service_role;

-- Coupure immédiate du nouveau moteur pour un examen, SANS toucher aux
-- données déjà enregistrées (les instances restent lisibles et corrigeables).
CREATE OR REPLACE FUNCTION public.qrc_disable_engine(p_quiz_id text, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seul un administrateur peut couper le moteur QRC' USING ERRCODE = 'P0465';
  END IF;
  UPDATE public.qrc_engine_flags
     SET enabled = false,
         note = coalesce(p_reason, 'Coupure automatique après anomalie de contrôle')
   WHERE quiz_id = p_quiz_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.qrc_disable_engine(text, text) TO authenticated, service_role;