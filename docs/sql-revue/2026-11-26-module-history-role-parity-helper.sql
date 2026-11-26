-- Narrow historical metadata only. The main progression RPC remains SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.historique_obligations_modules(_apprenant_id uuid)
RETURNS TABLE(module_id integer, exercice_id text, question_id text, ajout timestamptz, supp timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND (auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.apprenants a WHERE a.id = _apprenant_id AND (a.auth_user_id = auth.uid() OR a.id = auth.uid())
    )
  )) THEN
    RAISE EXCEPTION 'Accès au dossier non autorisé.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH c AS MATERIALIZED (
    SELECT amc.module_id, amc.details FROM public.apprenant_module_completion amc WHERE amc.apprenant_id = _apprenant_id
  ), keys AS (
    SELECT DISTINCT c.module_id, d->>'exerciceId' AS ex, d->>'questionId' AS qid
    FROM c CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(c.details) = 'array' THEN c.details ELSE '[]'::jsonb END) d
    WHERE d->>'exerciceId' IS NOT NULL AND d->>'questionId' IS NOT NULL
    UNION
    SELECT c.module_id, '1785332774763'::text, q::text
    FROM c CROSS JOIN generate_series(1,138) q
    WHERE c.module_id = 8 AND EXISTS (SELECT 1 FROM public.quiz_lyon_cohortes coh WHERE coh.apprenant_id = _apprenant_id)
  )
  SELECT l.module_id, l.exercice_id, l.question_id,
    max(l.created_at) FILTER (WHERE l.field = 'question_added'),
    max(l.created_at) FILTER (WHERE l.field = 'question_deleted')
  FROM public.module_admin_audit_log l JOIN keys k
    ON l.module_id = k.module_id AND l.exercice_id = k.ex AND l.question_id = k.qid
  WHERE l.field IN ('question_added', 'question_deleted')
  GROUP BY l.module_id, l.exercice_id, l.question_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.historique_obligations_modules(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.historique_obligations_modules(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.historique_obligations_modules(uuid) IS 'Owned dossier/admin only, recorded question keys and addition/deletion instants only; never admin actors, notes, content or other learner data. No writes.';