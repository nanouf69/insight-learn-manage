-- Rattrapage automatique borné des copies EB héritées (ancien circuit) vers la file IA.
CREATE OR REPLACE FUNCTION public.qrc_ia_copie_rattrapable(p_result_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE src public.apprenant_quiz_results%ROWTYPE; ap record; qs jsonb; nrep int; nbloq int;
BEGIN
  SELECT * INTO src FROM public.apprenant_quiz_results WHERE id=p_result_id;
  IF NOT FOUND THEN RETURN 'introuvable'; END IF;
  IF src.quiz_type<>'examen_blanc' THEN RETURN 'pas_eb'; END IF;
  IF EXISTS (SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id=src.apprenant_id) THEN RETURN 'compte_test'; END IF;
  IF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.snapshot->'source_historique'->>'result_id'=p_result_id::text) THEN RETURN 'deja_importe'; END IF;
  IF EXISTS (SELECT 1 FROM public.apprenant_quiz_results o WHERE o.apprenant_id=src.apprenant_id AND o.quiz_type='examen_blanc' AND o.quiz_id=src.quiz_id
      AND split_part(o.matiere_id,'__',1)=split_part(src.matiere_id,'__',1) AND o.id<>src.id
      AND (coalesce(o.tentative,1)>coalesce(src.tentative,1) OR (coalesce(o.tentative,1)=coalesce(src.tentative,1) AND o.completed_at>src.completed_at))) THEN RETURN 'pas_la_copie_affichee'; END IF;
  IF EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=src.apprenant_id AND a.exam_id=src.quiz_id
      AND coalesce(a.snapshot->'source_historique'->>'origine','')<>'import-historique' AND NOT coalesce(a.is_test,false)) THEN RETURN 'passage_nouveau_moteur_existe'; END IF;
  SELECT type_apprenant, modalite_formation INTO ap FROM public.apprenants WHERE id=src.apprenant_id;
  IF NOT FOUND OR NOT public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation) THEN RETURN 'non_elearning'; END IF;
  qs := CASE WHEN jsonb_typeof(src.details->'snapshot'->'questions')='array' THEN src.details->'snapshot'->'questions' ELSE '[]'::jsonb END;
  SELECT count(*) FILTER (WHERE length(trim(coalesce(src.details->'reponses'->>(q->>'id'),'')))>0),
         count(*) FILTER (WHERE jsonb_typeof(src.details->'correctionsIA'->(q->>'id'))='object'
            AND NOT (coalesce(src.details->'correctionsIA'->(q->>'id')->>'explication','') LIKE 'Correction déterministe%'
                  OR coalesce(src.details->'correctionsIA'->(q->>'id')->>'explication','') LIKE 'Résultat %'))
    INTO nrep, nbloq FROM jsonb_array_elements(qs) q WHERE upper(q->>'type')='QRC';
  IF coalesce(nrep,0)=0 THEN RETURN 'sans_qrc_repondue'; END IF;
  IF nbloq>0 THEN RETURN 'deja_corrigee_humain_ou_ia'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reponses_apprenants ra WHERE ra.apprenant_id=src.apprenant_id AND ra.exercice_type='examen_blanc'
      AND ra.exercice_id=src.quiz_id||'__'||src.matiere_id||CASE WHEN coalesce(src.tentative,1)>1 THEN '__t'||src.tentative ELSE '' END
      AND ra.status='submitted' AND ra.completed IS TRUE) THEN RETURN 'sans_preuve_remise_meme_tentative'; END IF;
  RETURN 'admissible';
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_copie_rattrapable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qrc_ia_copie_rattrapable(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.qrc_ia_rattrapage_historique_garde() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d jsonb;
BEGIN
  SELECT details INTO d FROM public.apprenant_quiz_results WHERE id = NEW.result_id;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d->'snapshot'->'questions')='array' THEN d->'snapshot'->'questions' ELSE '[]'::jsonb END) q
             WHERE upper(q->>'type')='QRC' AND jsonb_typeof(d->'correctionsIA'->(q->>'id'))='object'
               AND (coalesce(d->'correctionsIA'->(q->>'id')->>'validatedByAdmin','false')='true'
                    OR NOT (coalesce(d->'correctionsIA'->(q->>'id')->>'explication','') LIKE 'Correction déterministe%'
                         OR coalesce(d->'correctionsIA'->(q->>'id')->>'explication','') LIKE 'Résultat %'))) THEN
    RAISE EXCEPTION 'Copie déjà corrigée (formateur ou IA) : rattrapage IA refusé' USING ERRCODE='P0540';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.qrc_ia_rattrapage_historique_lot(p_limite integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; res jsonb; n_ok int:=0; n_err int:=0; det jsonb:='[]'::jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé administrateur' USING ERRCODE='42501'; END IF;
  IF NOT pg_try_advisory_xact_lock(hashtext('qrc_ia_rattrapage_historique_lot')) THEN RETURN jsonb_build_object('statut','deja_en_cours'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL) THEN RETURN jsonb_build_object('statut','ia_inactive_ou_pause'); END IF;
  FOR r IN SELECT q.id FROM public.apprenant_quiz_results q
           WHERE q.quiz_type='examen_blanc' AND q.completed_at > now() - interval '120 days'
             AND public.qrc_ia_copie_rattrapable(q.id)='admissible'
           ORDER BY q.completed_at LIMIT greatest(1, least(coalesce(p_limite,20), 50)) LOOP
    BEGIN
      res := public.qrc_ia_rattrapage_historique(r.id, 'Rattrapage automatique : copie EB héritée remise (preuve même tentative), sans correction formateur/IA');
      n_ok := n_ok+1; det := det || jsonb_build_array(jsonb_build_object('result_id',r.id,'statut',res->>'statut','file',res->>'file'));
    EXCEPTION WHEN OTHERS THEN
      n_err := n_err+1; det := det || jsonb_build_array(jsonb_build_object('result_id',r.id,'erreur',SQLSTATE));
      INSERT INTO public.alertes_systeme(type,titre,message,details,lu)
      VALUES('qrc_ia_rattrapage','Rattrapage QRC hérité en erreur','Copie non importée ; aucune donnée modifiée.',jsonb_build_object('result_id',r.id,'code',SQLSTATE)::text,false);
    END;
  END LOOP;
  RETURN jsonb_build_object('statut','ok','traitees',n_ok,'erreurs',n_err,'detail',det);
END $$;
REVOKE ALL ON FUNCTION public.qrc_ia_rattrapage_historique_lot(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_ia_rattrapage_historique_lot(integer) TO authenticated, service_role;

-- Réconciliation horaire (borne 20 copies) pour que le blocage ne revienne pas.
DO $do$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='qrc-ia-rattrapage-historique';
  PERFORM cron.schedule('qrc-ia-rattrapage-historique','17 * * * *', $$SELECT public.qrc_ia_rattrapage_historique_lot(20)$$);
END $do$;