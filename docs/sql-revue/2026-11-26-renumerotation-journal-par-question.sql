-- Suivi de 0299 : l'antériorité d'une clé se prouve PAR QUESTION, jamais par la date de création
-- d'une ligne globale de réponses. Une clé non datée n'est dispensée que si, en plus des conditions
-- de 0297/0299 (soumission sans la clé, clé répondue supprimée après, aucune soumission antérieure
-- contenant la clé), AUCUN événement du journal par question (tous comptes) n'existe pour cette clé
-- avec une valeur enregistrée (valeur ou valeur_originale) à ou avant la soumission. Chronologie ambiguë (horodatage client antérieur) = refus conservateur.
-- Les comptes auteurs sont lus via apprenants (contrôle 26/11 : 0 événement de journal hors dossier).
-- Lecture seule ; aucune donnée apprenant écrite.
CREATE OR REPLACE FUNCTION public.obligations_non_datees_anterieures(_apprenant_id uuid)
 RETURNS TABLE(module_id integer, exercice_id text, question_id text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND (auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND (a.auth_user_id = auth.uid() OR a.id = auth.uid())
    )
  )) THEN
    RAISE EXCEPTION 'Accès au dossier non autorisé.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH k AS (
    SELECT DISTINCT amc.module_id AS m, d->>'exerciceId' AS ex, d->>'questionId' AS qid
      FROM public.apprenant_module_completion amc,
           jsonb_array_elements(CASE WHEN jsonb_typeof(amc.details) = 'array' THEN amc.details ELSE '[]'::jsonb END) d
     WHERE amc.apprenant_id = _apprenant_id AND jsonb_typeof(d) = 'object'
       AND d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
       AND NOT public.reponse_enregistree(d->'reponseEleve')
       AND NOT EXISTS (SELECT 1 FROM public.module_admin_audit_log l
             WHERE l.module_id = amc.module_id AND l.exercice_id = d->>'exerciceId' AND l.question_id = d->>'questionId'
               AND l.field IN ('question_added', 'question_deleted'))
  ), c AS MATERIALIZED (
    SELECT k.m, k.ex, k.qid, s.exercice_id AS sex, s.submitted_at AS sat FROM k
      JOIN public.reponses_apprenants s ON s.apprenant_id = _apprenant_id
       AND s.exercice_id = 'module_' || k.m || '_exo_' || k.ex
       AND s.status = 'submitted' AND s.submitted_at IS NOT NULL AND jsonb_typeof(s.reponses) = 'object'
     WHERE NOT (s.reponses ? (k.ex || '-' || k.qid))
       AND EXISTS (SELECT 1 FROM jsonb_object_keys(s.reponses) key
                     JOIN public.module_admin_audit_log l ON l.module_id = k.m AND l.exercice_id = k.ex
                      AND l.question_id = substr(key, length(k.ex) + 2)
                      AND l.field = 'question_deleted' AND l.created_at > s.submitted_at
                    WHERE key LIKE k.ex || '-%')
       AND NOT EXISTS (SELECT 1 FROM public.reponses_apprenants o
                        WHERE o.exercice_id = s.exercice_id AND jsonb_typeof(o.reponses) = 'object'
                          AND o.status = 'submitted' AND o.submitted_at IS NOT NULL
                          AND o.submitted_at <= s.submitted_at
                          AND o.reponses ? (k.ex || '-' || k.qid))
  ), auteurs AS MATERIALIZED (
    -- Comptes ayant un événement de journal sur l'exercice à/avant la soumission (index apprenant+exercice).
    SELECT DISTINCT c.sex, c.sat, a.id AS aid
      FROM (SELECT DISTINCT sex, sat FROM c) c
      JOIN public.apprenants a ON EXISTS (
        SELECT 1 FROM public.reponses_apprenants_journal j0
         WHERE j0.apprenant_id = a.id AND j0.exercice_id = c.sex
           AND LEAST(j0.created_at, coalesce(j0.client_saved_at, j0.created_at)) <= c.sat)
  )
  SELECT c.m, c.ex, c.qid FROM c
   WHERE NOT EXISTS (
     SELECT 1 FROM auteurs au
       JOIN public.reponses_apprenants_journal j ON j.apprenant_id = au.aid
        AND j.exercice_id = c.sex AND j.question_id = c.ex || '-' || c.qid
      WHERE au.sex = c.sex AND au.sat = c.sat
        AND LEAST(j.created_at, coalesce(j.client_saved_at, j.created_at)) <= c.sat
        AND (public.reponse_enregistree(j.valeur) OR public.reponse_enregistree(j.valeur_originale)));
END;
$fn$;
REVOKE ALL ON FUNCTION public.obligations_non_datees_anterieures(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obligations_non_datees_anterieures(uuid) TO authenticated, service_role;
