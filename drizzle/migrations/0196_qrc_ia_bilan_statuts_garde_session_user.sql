CREATE OR REPLACE FUNCTION public.qrc_ia_bilan_statuts()
 RETURNS TABLE(qrc_instance_id uuid, attempt_id uuid, apprenant_id uuid, exam_id text, finished_at timestamp with time zone, statut text, suite_statut text, suite_code text, trace_statut text, trace_http integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.has_role(auth.uid(),'admin') AND NOT (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin')) THEN
  RAISE EXCEPTION 'Admin uniquement' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 WITH cfg AS (SELECT greatest(actif_depuis, timestamptz '2026-10-20 09:53+00') AS debut FROM public.qrc_ia_config WHERE id),
 p AS (
  SELECT a.attempt_id, a.apprenant_id, a.exam_id::text AS exam_id, a.finished_at, s.statut AS s_statut, s.dernier_code
  FROM public.exam_attempts_v2 a JOIN public.apprenants ap ON ap.id=a.apprenant_id
  LEFT JOIN public.qrc_ia_suites s ON s.attempt_id=a.attempt_id
  WHERE a.etat='terminee' AND NOT a.is_test AND a.apprenant_id<>'c0844007-b999-4385-9665-918e5077c3b5'
    AND NOT EXISTS(SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=a.apprenant_id)
    AND public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation)
    AND (s.attempt_id IS NOT NULL OR a.finished_at >= (SELECT debut FROM cfg))
 ),
 t AS (
  SELECT q.qrc_instance_id, q.attempt_id, q.etat, q.reponse IS NULL AS vide,
   (SELECT c.statut FROM public.qrc_ia_corrections c WHERE c.qrc_instance_id=q.qrc_instance_id ORDER BY c.created_at DESC LIMIT 1) AS c_statut,
   (SELECT c.http_status FROM public.qrc_ia_corrections c WHERE c.qrc_instance_id=q.qrc_instance_id ORDER BY c.created_at DESC LIMIT 1) AS c_http,
   (SELECT c.motif FROM public.qrc_ia_corrections c WHERE c.qrc_instance_id=q.qrc_instance_id ORDER BY c.created_at DESC LIMIT 1) AS c_motif,
   (SELECT r.statut FROM public.qrc_ia_reprises r WHERE r.qrc_instance_id=q.qrc_instance_id ORDER BY r.numero DESC LIMIT 1) AS r_statut,
   (SELECT r.http_status FROM public.qrc_ia_reprises r WHERE r.qrc_instance_id=q.qrc_instance_id ORDER BY r.numero DESC LIMIT 1) AS r_http
  FROM public.qrc_instances_v2 q WHERE q.attempt_id IN (SELECT p.attempt_id FROM p)
 )
 SELECT t.qrc_instance_id, p.attempt_id, p.apprenant_id, p.exam_id, p.finished_at,
  CASE
   WHEN t.etat='corrigee' THEN 'corrigee'
   WHEN t.vide OR t.c_motif='reponse_vide' THEN 'sans_reponse'
   WHEN coalesce(t.r_statut,t.c_statut)='en_cours' AND p.s_statut='en_cours' THEN 'en_cours'
   WHEN coalesce(t.r_statut,t.c_statut) IN ('en_cours','a_verifier','exclue') THEN 'revue'
   WHEN p.s_statut IN ('attente','en_cours') THEN 'en_file'
   WHEN p.s_statut IN ('a_verifier','pause') THEN 'revue'
   ELSE 'en_attente'
  END,
  p.s_statut, p.dernier_code, coalesce(t.r_statut,t.c_statut), coalesce(t.r_http,t.c_http)
 FROM t JOIN p ON p.attempt_id=t.attempt_id;
END $function$;

REVOKE ALL ON FUNCTION public.qrc_ia_bilan_statuts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_bilan_statuts() TO authenticated, service_role;
COMMENT ON FUNCTION public.qrc_ia_bilan_statuts() IS 'Admin/service_role uniquement ; SQL de confiance seulement si auth.uid() IS NULL et session_user postgres/supabase_admin (jamais current_user du definer).';