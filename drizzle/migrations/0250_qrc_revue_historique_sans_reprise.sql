CREATE OR REPLACE FUNCTION public.qrc_ia_enfiler(p_attempt uuid, p_origine text DEFAULT 'serveur') RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r text; s public.qrc_ia_suites; ins uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND current_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 r := public.qrc_ia_raison_file(p_attempt);
 IF r<>'admissible' THEN
  IF r IN ('rien_a_corriger','hors_periode') THEN
   UPDATE public.qrc_ia_suites qcs SET statut='a_verifier',
    message='QRC encore en attente mais non admissibles à une reprise automatique',
    dernier_code='qrc_en_attente_non_admissible', maj_at=now()
    WHERE qcs.attempt_id=p_attempt AND qcs.statut='terminee'
      AND EXISTS(SELECT 1 FROM public.qrc_instances_v2 q WHERE q.attempt_id=p_attempt AND q.etat='en_attente')
   RETURNING qcs.attempt_id INTO ins;
   IF ins IS NOT NULL THEN
    INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES(
     'qrc_ia_suite','Correction QRC à vérifier',
     'La file était terminée à tort alors que des QRC restent en attente ; aucune note ni nouvel appel IA.',
     jsonb_build_object('attempt_id',p_attempt,'code','qrc_en_attente_non_admissible')::text,false);
    RETURN 'revue_qrc_en_attente';
   END IF;
  END IF;
  RETURN r;
 END IF;
 INSERT INTO public.qrc_ia_suites(attempt_id, origine, maj_at, dernier_code) VALUES(p_attempt, left(p_origine,40), now(), 'en_file')
 ON CONFLICT (attempt_id) DO NOTHING RETURNING attempt_id INTO ins;
 IF ins IS NOT NULL THEN RETURN 'en_file'; END IF;
 SELECT * INTO s FROM public.qrc_ia_suites WHERE attempt_id=p_attempt FOR UPDATE;
 IF s.statut IN ('attente','en_cours') THEN RETURN 'deja_en_file'; END IF;
 IF s.statut='terminee' OR (s.statut='pause' AND EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL)) THEN
  IF s.remaining<=0 THEN
   UPDATE public.qrc_ia_suites SET statut='a_verifier', message='Budget épuisé alors que des QRC admissibles restent', dernier_code='budget_epuise', maj_at=now() WHERE attempt_id=p_attempt;
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_suite','Correction QRC à vérifier','Budget de continuation épuisé avec des QRC restantes.',jsonb_build_object('attempt_id',p_attempt,'code','budget_epuise')::text,false);
   RETURN 'revue_budget';
  END IF;
  UPDATE public.qrc_ia_suites SET statut='attente', next_at=now(), dispatches=0, lease_until=NULL,
   message='Réouverte ('||left(p_origine,40)||') : QRC admissibles sans trace', dernier_code='reouverte', maj_at=now() WHERE attempt_id=p_attempt;
  RETURN 'reouverte';
 END IF;
 RETURN 'revue_existante';
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_enfiler(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_enfiler(uuid,text) TO service_role;