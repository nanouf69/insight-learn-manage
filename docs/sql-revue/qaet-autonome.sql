-- Candidate tested only on disposable PostgreSQL until independent restoration is proven.
CREATE TABLE public.qaet_tentatives (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, numero integer NOT NULL,
 mode text NOT NULL CHECK(mode IN ('toutes','erreurs')), parent uuid,
 source_refs jsonb NOT NULL DEFAULT '[]', reponses jsonb NOT NULL DEFAULT '{}',
 revision bigint NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz, UNIQUE(user_id,numero)
);
GRANT SELECT ON public.qaet_tentatives TO authenticated;
GRANT ALL ON public.qaet_tentatives TO service_role;
ALTER TABLE public.qaet_tentatives ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.qaet_operations (
 user_id uuid NOT NULL, operation_id uuid NOT NULL, tentative_id uuid NOT NULL,
 commande jsonb NOT NULL, resultat jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,operation_id)
);
GRANT SELECT ON public.qaet_operations TO authenticated;
GRANT ALL ON public.qaet_operations TO service_role;
ALTER TABLE public.qaet_operations ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.qaet_eligible() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.apprenants a WHERE a.auth_user_id=auth.uid() AND a.deleted_at IS NULL
 AND lower(coalesce(a.type_apprenant,'')) IN ('taxi','taxi-e','taxi-e-presentiel','ta','ta-e','ta-e-presentiel','pa-taxi','rp-taxi')
 AND lower(coalesce(a.formation_choisie,'')) NOT LIKE '%continue%'
 AND (a.date_fin_cours_en_ligne IS NULL OR a.date_fin_cours_en_ligne >= (now() AT TIME ZONE 'Europe/Paris')::date)
 );
$$;
REVOKE ALL ON FUNCTION public.qaet_eligible() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qaet_eligible() TO authenticated,service_role;
CREATE POLICY qaet_owner ON public.qaet_tentatives FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.qaet_eligible());
CREATE POLICY qaet_operation_owner ON public.qaet_operations FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.qaet_eligible());

CREATE FUNCTION public.qaet_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'qaet_append_only' USING ERRCODE='42501'; END;
$$;
CREATE TRIGGER qaet_operation_immutable BEFORE UPDATE OR DELETE ON public.qaet_operations FOR EACH ROW EXECUTE FUNCTION public.qaet_append_only();
CREATE FUNCTION public.qaet_tentative_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'qaet_no_delete'; END IF;
 IF OLD.submitted_at IS NOT NULL OR NEW.id<>OLD.id OR NEW.user_id<>OLD.user_id OR NEW.source_refs<>OLD.source_refs
 OR NEW.numero<>OLD.numero OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'qaet_immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER qaet_tentative_immutable BEFORE UPDATE OR DELETE ON public.qaet_tentatives FOR EACH ROW EXECUTE FUNCTION public.qaet_tentative_guard();

-- Resolver reads original sources, never trusts a client corrigé or client score.
CREATE FUNCTION public.qaet_question(r jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE m int := (r->>'module')::int; e int := (r->>'exercice')::int;
 q jsonb; ex jsonb; n int; refid int; section int; quiz text;
BEGIN
 IF NOT ((m=7 AND (e BETWEEN 7001 AND 7015 OR e IN(7020,7021))) OR
 (m=12 AND e BETWEEN 300 AND 310) OR (m=9 AND e IN(203,204)) OR
 (m=11 AND e IN(605,606)) OR (m=27 AND e IN(250,251)) OR (m=28 AND e IN(700,701))) THEN RETURN NULL; END IF;
 SELECT x INTO ex FROM public.module_editor_state s CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.module_data->'exercices','[]')) x
 WHERE s.module_id=m AND x->>'id'=e::text;
 IF ex IS NULL OR ex->>'actif'='false' THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.quiz_question_bindings b WHERE b.module_id=m AND b.exercise_id=e) THEN
  IF (m=9 AND e IN(203,204)) OR (m=27 AND e IN(250,251)) THEN
   refid := (r->>'question')::int; section := refid / 1000;
   quiz := CASE WHEN e IN(203,250) THEN 'reglementation-nationale' ELSE 'reglementation-locale' END;
   IF (quiz='reglementation-nationale' AND section NOT IN(70,71)) OR (quiz='reglementation-locale' AND section NOT IN(73,76,74,75)) THEN RETURN NULL; END IF;
   SELECT count(*), (jsonb_agg(jsonb_build_object('enonce',z.enonce,'choix',z.choix))->0) INTO n,q
   FROM public.quiz_questions z WHERE z.quiz_id=quiz AND z.section_id=section AND z.legacy_question_id=refid%1000 AND z.active;
  ELSE
   SELECT count(*), (jsonb_agg(jsonb_build_object('enonce',z.enonce,'choix',z.choix))->0) INTO n,q
   FROM public.quiz_questions z JOIN public.quiz_question_bindings b ON b.quiz_id=z.quiz_id AND b.section_id=z.section_id
   WHERE b.module_id=m AND b.exercise_id=e AND z.legacy_question_id=(r->>'question')::int AND z.active;
  END IF;
 ELSE
  SELECT count(*),(jsonb_agg(x)->0) INTO n,q FROM jsonb_array_elements(coalesce(ex->'questions','[]')) x WHERE x->>'id'=r->>'question';
 END IF;
 IF n<>1 OR q IS NULL OR upper(coalesce(q->>'type','QCM'))='QRC' OR jsonb_array_length(coalesce(q->'choix','[]'))=0
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true') THEN RETURN NULL; END IF;
 RETURN q;
END;
$$;
REVOKE ALL ON FUNCTION public.qaet_question(jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.qaet_etat(p_cible uuid DEFAULT NULL,p_notation boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE t record; r jsonb; q jsonb; a jsonb; rows jsonb := '[]'; correct jsonb; ok int; total int; hashes jsonb;
BEGIN
 IF NOT public.qaet_eligible() THEN RAISE EXCEPTION 'qaet_taxi_requis' USING ERRCODE='42501'; END IF;
 FOR t IN SELECT * FROM public.qaet_tentatives WHERE user_id=auth.uid() AND (p_cible IS NULL OR id=p_cible) ORDER BY numero LOOP
  ok:=0; total:=0; hashes:='{}';
  FOR r IN SELECT value FROM jsonb_array_elements(t.source_refs) WHERE p_notation LOOP
   q:=public.qaet_question(r); a:=t.reponses->(r->>'cle');
   IF q IS NULL THEN CONTINUE; END IF;
   hashes:=jsonb_set(hashes,ARRAY[r->>'cle'],to_jsonb(public.qaet_empreinte(q)));
   IF a IS NOT NULL AND a->>'empreinte'<>public.qaet_empreinte(q) THEN CONTINUE; END IF;
   total:=total+1;
   SELECT coalesce(jsonb_agg(c->>'lettre' ORDER BY c->>'lettre'),'[]') INTO correct FROM jsonb_array_elements(q->'choix') c WHERE c->>'correct'='true';
   IF a->'lettres'=correct THEN ok:=ok+1; END IF;
  END LOOP;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',t.id,'numero',t.numero,'creeLe',t.created_at,'termineeLe',t.submitted_at,
    'mode',t.mode,'parent',t.parent,'cles',(SELECT jsonb_agg(x->>'cle') FROM jsonb_array_elements(t.source_refs) x),
    'reponses',t.reponses,'revision',t.revision,'empreintes',hashes,'note20',CASE WHEN total>0 THEN round(ok*20.0/total,2) ELSE NULL END));
 END LOOP;
 RETURN jsonb_build_object('tentatives',rows,'coursActif',EXISTS(SELECT 1 FROM public.apprenant_connexions c
 WHERE c.user_id=auth.uid() AND c.ended_at IS NULL));
END;
$$;
CREATE FUNCTION public.qaet_empreinte(q jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT md5((q->>'enonce')||'|'||coalesce((SELECT jsonb_agg(c - 'correct' ORDER BY ord)::text FROM jsonb_array_elements(q->'choix') WITH ORDINALITY AS x(c,ord)),''));
$$;
REVOKE ALL ON FUNCTION public.qaet_empreinte(jsonb),public.qaet_etat(uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.qaet_commande(p_operation uuid,p_action text,p_tentative uuid,p_revision bigint,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.qaet_tentatives; op public.qaet_operations; r jsonb; q jsonb; command jsonb; result jsonb; letters jsonb; i int;
BEGIN
 IF NOT public.qaet_eligible() THEN RAISE EXCEPTION 'qaet_taxi_requis' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF p_action='read' THEN RETURN public.qaet_etat(); END IF;
 IF p_operation IS NULL OR p_tentative IS NULL THEN RAISE EXCEPTION 'qaet_operation_requise'; END IF;
 command:=jsonb_build_object('action',p_action,'tentative',p_tentative,'revision',p_revision,'payload',p_payload);
 SELECT * INTO op FROM public.qaet_operations WHERE user_id=auth.uid() AND operation_id=p_operation;
 IF FOUND THEN
  IF op.commande<>command THEN RAISE EXCEPTION 'qaet_operation_conflit'; END IF;
  RETURN public.qaet_etat();
 END IF;
 IF EXISTS(SELECT 1 FROM public.apprenant_connexions c WHERE c.user_id=auth.uid() AND c.ended_at IS NULL) THEN
  RAISE EXCEPTION 'Terminez votre session de cours avant de commencer le quiz facultatif.'; END IF;
 IF p_action='start' THEN
  IF jsonb_typeof(p_payload->'references')<>'array' OR jsonb_array_length(p_payload->'references') NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'qaet_sources_invalides'; END IF;
  IF coalesce(p_payload->>'mode','toutes')='toutes' AND jsonb_array_length(p_payload->'references')<>671 THEN RAISE EXCEPTION 'qaet_inventaire_incomplet'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'references') x GROUP BY x->>'cle' HAVING count(*)>1) THEN RAISE EXCEPTION 'qaet_doublon'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_payload->'references') LOOP
   IF public.qaet_question(r) IS NULL THEN RAISE EXCEPTION 'qaet_source_non_verifiee'; END IF;
  END LOOP;
  IF p_payload->>'mode'='erreurs' AND NOT EXISTS(SELECT 1 FROM public.qaet_tentatives z WHERE z.id=(p_payload->>'parent')::uuid AND z.user_id=auth.uid() AND z.submitted_at IS NOT NULL) THEN RAISE EXCEPTION 'qaet_parent_invalide'; END IF;
  SELECT coalesce(max(numero),0)+1 INTO i FROM public.qaet_tentatives WHERE user_id=auth.uid();
  INSERT INTO public.qaet_tentatives(id,user_id,numero,mode,parent,source_refs) VALUES(p_tentative,auth.uid(),i,coalesce(p_payload->>'mode','toutes'),(p_payload->>'parent')::uuid,p_payload->'references');
 ELSE
  SELECT * INTO t FROM public.qaet_tentatives WHERE id=p_tentative AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'qaet_tentative_interdite' USING ERRCODE='42501'; END IF;
  IF t.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'qaet_terminee'; END IF;
  IF t.revision<>p_revision THEN RAISE EXCEPTION 'qaet_revision_conflit'; END IF;
  IF p_action='answer' THEN
   SELECT x INTO r FROM jsonb_array_elements(t.source_refs) x WHERE x->>'cle'=p_payload->>'cle';
   q:=public.qaet_question(r);
   IF q IS NULL THEN RAISE EXCEPTION 'qaet_source_non_verifiee'; END IF;
   IF p_payload->>'empreinte' IS DISTINCT FROM public.qaet_empreinte(q) THEN RAISE EXCEPTION 'qaet_contenu_modifie'; END IF;
   IF jsonb_typeof(p_payload->'lettres')<>'array' THEN RAISE EXCEPTION 'qaet_choix_invalide'; END IF;
   SELECT coalesce(jsonb_agg(v ORDER BY v),'[]') INTO letters FROM (SELECT DISTINCT value #>> '{}' v FROM jsonb_array_elements(p_payload->'lettres')) s;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(letters) l WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c->>'lettre'=l)) THEN RAISE EXCEPTION 'qaet_choix_invalide'; END IF;
   UPDATE public.qaet_tentatives SET reponses=jsonb_set(reponses,ARRAY[p_payload->>'cle'],jsonb_build_object('lettres',letters,'empreinte',public.qaet_empreinte(q),'le',now())),revision=revision+1 WHERE id=t.id;
  ELSIF p_action='finish' THEN
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(t.source_refs) x WHERE t.reponses->(x->>'cle') IS NULL OR jsonb_array_length(t.reponses->(x->>'cle')->'lettres')=0) THEN RAISE EXCEPTION 'qaet_reponses_incompletes'; END IF;
   UPDATE public.qaet_tentatives SET submitted_at=now(),revision=revision+1 WHERE id=t.id;
  ELSE RAISE EXCEPTION 'qaet_action_invalide'; END IF;
 END IF;
 result:=public.qaet_etat(p_tentative,p_action='finish');
 INSERT INTO public.qaet_operations(user_id,operation_id,tentative_id,commande,resultat) VALUES(auth.uid(),p_operation,p_tentative,command,result);
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.qaet_commande(uuid,text,uuid,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qaet_commande(uuid,text,uuid,bigint,jsonb) TO authenticated;