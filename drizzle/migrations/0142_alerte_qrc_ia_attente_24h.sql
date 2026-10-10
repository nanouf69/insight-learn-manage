CREATE OR REPLACE FUNCTION public.alerter_qrc_ia_attente_24h()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; n integer := 0;
BEGIN
  -- Une seule alerte par passage (jamais répétée). Aucune réponse ni donnée
  -- personnelle copiée : identifiants techniques, examen, nombre, ancienneté.
  FOR r IN
    SELECT a.attempt_id, a.apprenant_id, a.exam_id, min(a.finished_at) AS fin, count(*) AS nb
    FROM public.qrc_instances_v2 q
    JOIN public.exam_attempts_v2 a ON a.attempt_id = q.attempt_id
    JOIN public.apprenants ap ON ap.id = a.apprenant_id
    WHERE q.etat = 'en_attente'
      AND a.etat = 'terminee' AND NOT a.is_test
      AND a.finished_at >= '2026-09-30 22:00+00'
      AND a.finished_at < now() - interval '24 hours'
      AND (lower(coalesce(ap.type_apprenant,'')) LIKE '%-e' OR lower(coalesce(ap.type_apprenant,'')) LIKE '%learning%')
      AND NOT EXISTS (
        SELECT 1 FROM public.qrc_ia_corrections c
        WHERE c.qrc_instance_id = q.qrc_instance_id AND c.statut NOT IN ('en_cours','erreur'))
    GROUP BY a.attempt_id, a.apprenant_id, a.exam_id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.alertes_systeme s
                   WHERE s.type = 'qrc_ia_attente_24h' AND s.details LIKE '%' || r.attempt_id::text || '%') THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details, lu)
      VALUES ('qrc_ia_attente_24h',
              'Correction IA en attente depuis plus de 24 h',
              r.nb || ' réponse(s) écrite(s) de l''examen ' || r.exam_id || ' attendent la correction IA depuis plus de 24 h.',
              jsonb_build_object('attempt_id', r.attempt_id, 'apprenant_id', r.apprenant_id, 'exam_id', r.exam_id,
                                 'nb_reponses_en_attente', r.nb, 'passage_termine_le', r.fin)::text,
              false);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.alerter_qrc_ia_attente_24h() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alerter_qrc_ia_attente_24h() TO service_role;

SELECT cron.schedule('alerte-qrc-ia-attente-24h', '17 * * * *', $$SELECT public.alerter_qrc_ia_attente_24h();$$);