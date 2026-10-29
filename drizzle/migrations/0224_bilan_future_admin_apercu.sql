CREATE OR REPLACE FUNCTION public.bilan_future_admin_apercu(p_apprenant uuid, p_module integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o uuid;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF p_module NOT IN (5,11) THEN RETURN jsonb_build_object('route','legacy'); END IF;
  SELECT auth_user_id INTO o FROM public.apprenants WHERE id=p_apprenant;
  IF o IS NULL OR (SELECT count(*) FROM public.bilan_future_eligibility WHERE owner_id=o AND module_id=p_module)<>5 THEN
    RETURN jsonb_build_object('route','legacy');
  END IF;
  RETURN jsonb_build_object('route','future','matieres',(
    SELECT jsonb_agg(jsonb_build_object('exercise_id',e.exercise_id,
      'submitted',(SELECT jsonb_build_object('correct_count',s.correct_count,'question_count',s.question_count)
                    FROM public.bilan_future_receipts r JOIN public.bilan_future_submissions s ON s.receipt_id=r.id
                    WHERE r.owner_id=o AND r.module_id=p_module AND r.exercise_id=e.exercise_id LIMIT 1),
      'questions',(SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',q->'id','enonce',q->'enonce','image',q->'image','imageSize',q->'imageSize',
          'choix',(SELECT jsonb_agg(jsonb_build_object('lettre',c->'lettre','texte',c->'texte') ORDER BY k) FROM jsonb_array_elements(q->'choix') WITH ORDINALITY x(c,k)))) ORDER BY n)
        FROM public.bilan_future_versions v, jsonb_array_elements(v.questions) WITH ORDINALITY y(q,n) WHERE v.id=e.version_id)
    ) ORDER BY e.exercise_id) FROM public.bilan_future_eligibility e WHERE e.owner_id=o AND e.module_id=p_module));
END $$;
REVOKE ALL ON FUNCTION public.bilan_future_admin_apercu(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bilan_future_admin_apercu(uuid,integer) TO authenticated;