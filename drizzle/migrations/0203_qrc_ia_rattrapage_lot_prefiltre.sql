CREATE OR REPLACE FUNCTION public.qrc_ia_rattrapage_historique_lot(p_limite integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; res jsonb; n_ok int:=0; n_err int:=0; det jsonb:='[]'::jsonb; lim int := greatest(1, least(coalesce(p_limite,20), 50));
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé administrateur' USING ERRCODE='42501'; END IF;
  IF NOT pg_try_advisory_xact_lock(hashtext('qrc_ia_rattrapage_historique_lot')) THEN RETURN jsonb_build_object('statut','deja_en_cours'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.qrc_ia_config WHERE id AND actif AND pause_depuis IS NULL) THEN RETURN jsonb_build_object('statut','ia_inactive_ou_pause'); END IF;
  FOR r IN
    WITH c AS (
      SELECT q.id, q.completed_at FROM public.apprenant_quiz_results q
      JOIN public.apprenants ap ON ap.id = q.apprenant_id
      WHERE q.quiz_type='examen_blanc' AND q.completed_at > now() - interval '120 days'
        AND public.qrc_ia_type_elearning(ap.type_apprenant, ap.modalite_formation)
        AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE (a.snapshot->'source_historique'->>'result_id') = q.id::text)
        AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=q.apprenant_id AND a.exam_id=q.quiz_id
                          AND coalesce(a.snapshot->'source_historique'->>'origine','')<>'import-historique' AND NOT coalesce(a.is_test,false))
        AND EXISTS (SELECT 1 FROM public.reponses_apprenants ra WHERE ra.apprenant_id=q.apprenant_id AND ra.exercice_type='examen_blanc'
                      AND ra.exercice_id=q.quiz_id||'__'||q.matiere_id||CASE WHEN coalesce(q.tentative,1)>1 THEN '__t'||q.tentative ELSE '' END
                      AND ra.status='submitted' AND ra.completed IS TRUE)
    )
    SELECT c.id FROM c WHERE public.qrc_ia_copie_rattrapable(c.id)='admissible' ORDER BY c.completed_at LIMIT lim
  LOOP
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