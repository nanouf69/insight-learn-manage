-- ============================================================================
-- PILOTE RÉEL DU NOYAU SÉCURISÉ (données TEST uniquement)
-- Additif : aucune table existante n'est modifiée de façon destructive.
-- ============================================================================

-- 1) Marquage TEST (additif, défaut false : aucune donnée existante concernée)
ALTER TABLE public.exam_attempts_v2 ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.exam_content_versions ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- 2) Résultat officiel : une seule source, lue à l'identique par l'Admin et l'apprenant
CREATE TABLE IF NOT EXISTS public.core_exam_results (
  result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL UNIQUE REFERENCES public.exam_attempts_v2(attempt_id),
  apprenant_id uuid NOT NULL,
  result_revision integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'provisoire',
  score numeric,
  total numeric,
  qrc_restantes integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT core_exam_results_status_chk CHECK (status IN ('provisoire','definitif'))
);

GRANT SELECT ON public.core_exam_results TO authenticated;
GRANT ALL ON public.core_exam_results TO service_role;
ALTER TABLE public.core_exam_results ENABLE ROW LEVEL SECURITY;

-- Propriétaire (apprenant) ou administrateur uniquement
CREATE OR REPLACE FUNCTION public.core_est_proprietaire(p_apprenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = p_apprenant_id AND a.auth_user_id = auth.uid());
$$;

CREATE POLICY "Resultat visible par son apprenant ou un admin"
ON public.core_exam_results FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

-- Aucune écriture directe : le résultat n'est produit que par les fonctions serveur.

-- 3) Resserrage des lectures du noyau : apprenant = ses données, admin = tout
DROP POLICY IF EXISTS "Lecture des tentatives authentifiee" ON public.exam_attempts_v2;
CREATE POLICY "Lecture des tentatives par proprietaire ou admin"
ON public.exam_attempts_v2 FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lecture des reponses authentifiee" ON public.answer_state;
CREATE POLICY "Lecture des reponses par proprietaire ou admin"
ON public.answer_state FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lecture des QRC authentifiee" ON public.qrc_instances_v2;
CREATE POLICY "Lecture des QRC par proprietaire ou admin"
ON public.qrc_instances_v2 FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lecture du journal des reponses" ON public.answer_events;
CREATE POLICY "Lecture du journal des reponses par proprietaire ou admin"
ON public.answer_events FOR SELECT TO authenticated
USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

-- La correction est réservée aux administrateurs (domaine formateur)
DROP POLICY IF EXISTS "Correction de QRC authentifiee" ON public.qrc_instances_v2;
CREATE POLICY "Correction de QRC par admin"
ON public.qrc_instances_v2 FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Recalcul serveur du résultat (jamais dans le navigateur)
CREATE OR REPLACE FUNCTION public.core_recalc_result(p_attempt_id uuid)
RETURNS public.core_exam_results LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  att public.exam_attempts_v2;
  v_total numeric := 0;
  v_obtenu numeric := 0;
  v_restantes integer := 0;
  res public.core_exam_results;
  q jsonb;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF att IS NULL THEN
    RAISE EXCEPTION 'ATTEMPT_INCONNUE: %', p_attempt_id USING ERRCODE = 'P0475';
  END IF;

  -- barème total pris dans le SNAPSHOT immuable de la tentative
  FOR q IN SELECT value FROM jsonb_array_elements(att.snapshot->'questions') LOOP
    v_total := v_total + coalesce((q #>> '{points}')::numeric, 0);
  END LOOP;

  SELECT coalesce(sum(note), 0), count(*) FILTER (WHERE etat = 'en_attente')
    INTO v_obtenu, v_restantes
  FROM public.qrc_instances_v2 WHERE attempt_id = p_attempt_id;

  INSERT INTO public.core_exam_results (attempt_id, apprenant_id, result_revision, status, score, total, qrc_restantes, published_at)
  VALUES (p_attempt_id, att.apprenant_id, 1,
          CASE WHEN v_restantes = 0 THEN 'definitif' ELSE 'provisoire' END,
          CASE WHEN v_total > 0 THEN round(v_obtenu / v_total * 20, 2) ELSE NULL END,
          v_total, v_restantes,
          CASE WHEN v_restantes = 0 THEN now() ELSE NULL END)
  ON CONFLICT (attempt_id) DO UPDATE SET
    result_revision = public.core_exam_results.result_revision + 1,
    status = EXCLUDED.status,
    score = EXCLUDED.score,
    total = EXCLUDED.total,
    qrc_restantes = EXCLUDED.qrc_restantes,
    published_at = CASE WHEN EXCLUDED.status = 'definitif'
                        THEN coalesce(public.core_exam_results.published_at, now()) ELSE NULL END,
    updated_at = now()
  RETURNING * INTO res;

  RETURN res;
END;
$$;

-- 5) Correction + recalcul + publication : une seule transaction, idempotente
CREATE OR REPLACE FUNCTION public.core_correct_qrc_publish(
  p_operation_id uuid,
  p_qrc_instance_id uuid,
  p_note numeric,
  p_commentaire text DEFAULT NULL,
  p_corrige_email text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rejoue jsonb;
  inst public.qrc_instances_v2;
  res public.core_exam_results;
BEGIN
  SELECT resultat INTO rejoue FROM public.core_operations WHERE operation_id = p_operation_id;
  IF rejoue IS NOT NULL THEN
    RETURN rejoue;  -- idempotence : double-clic, F5, retry réseau
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'CORRECTION_NON_AUTORISEE: seul un administrateur peut corriger une QRC.'
      USING ERRCODE = 'P0481';
  END IF;

  PERFORM public.core_correct_qrc(p_operation_id, p_qrc_instance_id, p_note, p_commentaire, p_corrige_email);

  SELECT * INTO inst FROM public.qrc_instances_v2 WHERE qrc_instance_id = p_qrc_instance_id;
  res := public.core_recalc_result(inst.attempt_id);

  RETURN jsonb_build_object(
    'qrc_instance_id', inst.qrc_instance_id,
    'etat', inst.etat,
    'note', inst.note,
    'result_id', res.result_id,
    'result_revision', res.result_revision,
    'status', res.status,
    'score', res.score,
    'qrc_restantes', res.qrc_restantes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.core_correct_qrc_publish(uuid, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.core_correct_qrc_publish(uuid, uuid, numeric, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.core_recalc_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.core_recalc_result(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.core_est_proprietaire(uuid) TO authenticated, service_role;

-- 6) Temps réel : simple signal, aucune vérité métier transportée
ALTER TABLE public.core_exam_results REPLICA IDENTITY FULL;
ALTER TABLE public.qrc_instances_v2 REPLICA IDENTITY FULL;
DO $pub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.core_exam_results;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.qrc_instances_v2;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END;
$pub$;

COMMENT ON TABLE public.core_exam_results IS 'Résultat officiel du noyau sécurisé : source unique lue par l''Admin et par l''apprenant.';
COMMENT ON COLUMN public.exam_attempts_v2.is_test IS 'Tentative du pilote TEST (données fictives), supprimable par le mécanisme de nettoyage du pilote.';