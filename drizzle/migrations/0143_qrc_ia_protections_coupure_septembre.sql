-- Protections correction IA (accord du 10/10/2026). Lecture + insertion d'alertes uniquement.
-- Jamais de réactivation automatique, jamais de modification de copie/note.

CREATE OR REPLACE FUNCTION public.qrc_ia_copies_en_attente_elearning(p_min_age interval DEFAULT interval '0')
RETURNS TABLE(attempt_id uuid, apprenant_id uuid, exam_id text, fin timestamptz, nb bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.attempt_id, a.apprenant_id, a.exam_id::text, min(a.finished_at), count(*)
  FROM public.qrc_instances_v2 q
  JOIN public.exam_attempts_v2 a ON a.attempt_id = q.attempt_id
  JOIN public.apprenants ap ON ap.id = a.apprenant_id
  WHERE q.etat = 'en_attente' AND a.etat = 'terminee' AND NOT a.is_test
    AND a.finished_at >= '2026-08-31 22:00+00'
    AND a.finished_at < now() - p_min_age
    AND (lower(coalesce(ap.type_apprenant,'')) LIKE '%-e' OR lower(coalesce(ap.type_apprenant,'')) LIKE '%learning%')
    AND NOT EXISTS (SELECT 1 FROM public.qrc_ia_corrections c
                    WHERE c.qrc_instance_id = q.qrc_instance_id AND c.statut NOT IN ('en_cours','erreur'))
  GROUP BY a.attempt_id, a.apprenant_id, a.exam_id
$$;
REVOKE ALL ON FUNCTION public.qrc_ia_copies_en_attente_elearning(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_copies_en_attente_elearning(interval) TO service_role;

-- Compteur pour la confirmation avant désactivation (admin uniquement, aucun contenu de réponse).
CREATE OR REPLACE FUNCTION public.qrc_ia_compter_copies_en_attente()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'reserve aux administrateurs' USING ERRCODE = 'P0481';
  END IF;
  SELECT jsonb_build_object('reponses', coalesce(sum(nb),0), 'passages', count(*))
    INTO r FROM public.qrc_ia_copies_en_attente_elearning(interval '0');
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_compter_copies_en_attente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_compter_copies_en_attente() TO authenticated;

-- Alerte "> 24 h" étendue à septembre, dédupliquée par passage, regroupée au-delà de 5 nouveaux passages.
CREATE OR REPLACE FUNCTION public.alerter_qrc_ia_attente_24h()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE nouveaux jsonb; nb_pass int; nb_rep bigint; r jsonb; n int := 0;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('attempt_id', c.attempt_id, 'apprenant_id', c.apprenant_id,
            'exam_id', c.exam_id, 'nb_reponses_en_attente', c.nb, 'passage_termine_le', c.fin)), '[]'::jsonb),
         count(*), coalesce(sum(c.nb),0)
    INTO nouveaux, nb_pass, nb_rep
  FROM public.qrc_ia_copies_en_attente_elearning(interval '24 hours') c
  WHERE NOT EXISTS (SELECT 1 FROM public.alertes_systeme s
                    WHERE s.type = 'qrc_ia_attente_24h' AND s.details LIKE '%' || c.attempt_id::text || '%');

  IF nb_pass = 0 THEN
    n := 0;
  ELSIF nb_pass <= 5 THEN
    FOR r IN SELECT * FROM jsonb_array_elements(nouveaux) LOOP
      INSERT INTO public.alertes_systeme (type, titre, message, details, lu)
      VALUES ('qrc_ia_attente_24h', 'Correction IA en attente depuis plus de 24 h',
              (r->>'nb_reponses_en_attente') || ' réponse(s) écrite(s) de l''examen ' || (r->>'exam_id') || ' attendent la correction IA depuis plus de 24 h.',
              r::text, false);
      n := n + 1;
    END LOOP;
  ELSE
    INSERT INTO public.alertes_systeme (type, titre, message, details, lu)
    VALUES ('qrc_ia_attente_24h', 'Correction IA en attente depuis plus de 24 h',
            nb_rep || ' réponse(s) écrite(s) sur ' || nb_pass || ' passage(s) attendent la correction IA depuis plus de 24 h.',
            jsonb_build_object('regroupe', true, 'passages', nouveaux)::text, false);
    n := 1;
  END IF;

  PERFORM public.alerter_qrc_ia_coupee();
  RETURN n;
END $$;

-- Alerte "correction IA coupée ou en pause" : une seule fois par coupure.
CREATE OR REPLACE FUNCTION public.alerter_qrc_ia_coupee()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE cfg public.qrc_ia_config; cle text; nb_pass int; nb_rep bigint; dern record;
BEGIN
  SELECT * INTO cfg FROM public.qrc_ia_config WHERE id;
  IF cfg IS NULL OR (cfg.actif AND cfg.pause_depuis IS NULL) THEN RETURN 0; END IF;

  SELECT count(*), coalesce(sum(nb),0) INTO nb_pass, nb_rep
  FROM public.qrc_ia_copies_en_attente_elearning(interval '1 hour');
  IF nb_pass = 0 THEN RETURN 0; END IF;

  IF cfg.pause_depuis IS NOT NULL THEN
    cle := 'pause:' || cfg.pause_depuis::text;
  ELSE
    SELECT created_at, auteur_email INTO dern FROM public.audit_journal
     WHERE operation = 'qrc_ia_interrupteur' AND (apres->>'actif') = 'false'
     ORDER BY created_at DESC LIMIT 1;
    cle := 'coupure:' || coalesce(dern.created_at, cfg.updated_at)::text;
  END IF;

  IF EXISTS (SELECT 1 FROM public.alertes_systeme WHERE type = 'qrc_ia_coupee' AND details LIKE '%"cle": "' || cle || '"%') THEN
    RETURN 0;
  END IF;

  INSERT INTO public.alertes_systeme (type, titre, message, details, lu)
  VALUES ('qrc_ia_coupee',
          CASE WHEN cfg.pause_depuis IS NOT NULL THEN 'Correction IA en pause automatique' ELSE 'Correction IA désactivée' END,
          nb_rep || ' réponse(s) écrite(s) e-learning sur ' || nb_pass || ' passage(s) attendent depuis plus d''1 h. Aucune réactivation automatique : action d''un administrateur requise.',
          jsonb_build_object('cle', cle,
            'depuis', coalesce(cfg.pause_depuis, dern.created_at, cfg.updated_at),
            'compte', CASE WHEN cfg.pause_depuis IS NOT NULL THEN 'automatique' ELSE dern.auteur_email END,
            'motif_pause', cfg.pause_motif,
            'passages_en_attente', nb_pass, 'reponses_en_attente', nb_rep)::text,
          false);
  RETURN 1;
END $$;

REVOKE ALL ON FUNCTION public.alerter_qrc_ia_coupee() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alerter_qrc_ia_coupee() TO service_role;
REVOKE ALL ON FUNCTION public.alerter_qrc_ia_attente_24h() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alerter_qrc_ia_attente_24h() TO service_role;