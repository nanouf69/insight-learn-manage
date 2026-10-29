-- Prepared and tested on disposable PostgreSQL only. Not activated in Cloud.
-- Existing TA response rows are never converted into historical snapshots.
CREATE OR REPLACE FUNCTION public.bilan_ta_ouvrir_futur(p_exercice_id integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE a uuid; s public.bilan_passage_snapshots; qs jsonb; section integer;
BEGIN
  IF p_exercice_id NOT IN (700,701) THEN RAISE EXCEPTION 'Matière TA non concernée' USING ERRCODE='22023'; END IF;
  SELECT id INTO a FROM public.apprenants WHERE auth_user_id=auth.uid() LIMIT 1;
  IF a IS NULL OR NOT public.is_current_user_apprenant(a) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ouvrir:'||a||':module_28_exo_'||p_exercice_id,0));
  SELECT * INTO s FROM public.bilan_passage_snapshots
    WHERE apprenant_id=a AND module_id=28 AND exercice_id=p_exercice_id ORDER BY tentative DESC LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('statut','fige','snapshot_id',s.id,'tentative',s.tentative); END IF;
  IF EXISTS(SELECT 1 FROM public.reponses_apprenants WHERE apprenant_id=a AND exercice_id='module_28_exo_'||p_exercice_id)
     OR EXISTS(SELECT 1 FROM public.reponses_apprenants_historique WHERE apprenant_id=a AND exercice_id='module_28_exo_'||p_exercice_id)
  THEN RETURN jsonb_build_object('statut','ancien'); END IF;
  section:=CASE p_exercice_id WHEN 700 THEN 605 ELSE 606 END;
  SELECT jsonb_agg(jsonb_build_object(
    'position',position,'uid',question_id,'question_id',legacy_question_id::text,
    'cle',p_exercice_id||'-'||legacy_question_id,'type','QCM',
    'question_source',jsonb_build_object('id',legacy_question_id,'question_id',question_id,
       'uid',question_id,'type','QCM','enonce',enonce,'choix',choix,
       'image',image,'imageSize',image_size,'explication',explication,'_bilanCanonicalFige',true)
    ) ORDER BY position,legacy_question_id) INTO qs
  FROM public.quiz_questions WHERE quiz_id='bilan-examen-taxi' AND section_id=section AND active
    AND NOT(btrim(enonce) ILIKE 'Nouvelle question' AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(choix) c WHERE btrim(coalesce(c->>'texte','')) !~* '^choix [a-z]$'));
  IF qs IS NULL OR jsonb_array_length(qs)=0 THEN RAISE EXCEPTION 'Lecture canonique vide' USING ERRCODE='P0495'; END IF;
  INSERT INTO public.bilan_passage_snapshots(apprenant_id,module_id,exercice_id,filiere,matiere,tentative,
     passage_cle,questions,nb_questions,empreinte,empreinte_source)
  VALUES(a,28,p_exercice_id,'TA',CASE section WHEN 605 THEN 'Nationale' ELSE 'Locale' END,1,
     'module_28_exo_'||p_exercice_id,qs,jsonb_array_length(qs),md5(qs::text),md5(qs::text)) RETURNING * INTO s;
  RETURN jsonb_build_object('statut','fige','snapshot_id',s.id,'tentative',s.tentative);
END $$;
REVOKE ALL ON FUNCTION public.bilan_ta_ouvrir_futur(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_ta_ouvrir_futur(integer) TO authenticated;