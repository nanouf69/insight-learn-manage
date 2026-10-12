CREATE OR REPLACE FUNCTION public.examens_blancs_preuve_soumission(_apprenant_id uuid, _module_id integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ex AS (SELECT exam_id FROM public.examens_blancs_parcours WHERE module_id = _module_id),
  req AS (SELECT q.quiz_id, count(DISTINCT split_part(q.matiere_id,'__',1)) rq FROM public.apprenant_quiz_results q
          WHERE q.quiz_type='examen_blanc' AND q.quiz_id IN (SELECT exam_id FROM ex) GROUP BY 1),
  per AS (SELECT ex.exam_id,
    EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.apprenant_id=_apprenant_id AND a.exam_id=ex.exam_id
            AND a.etat='terminee' AND NOT coalesce(a.is_test,false)) v2,
    (SELECT count(DISTINCT split_part(q.matiere_id,'__',1)) FROM public.apprenant_quiz_results q
      WHERE q.apprenant_id=_apprenant_id AND q.quiz_type='examen_blanc' AND q.quiz_id=ex.exam_id) nm,
    (SELECT count(DISTINCT split_part(substr(r.exercice_id, length(ex.exam_id)+3),'__',1)) FROM public.reponses_apprenants r
      WHERE r.apprenant_id=_apprenant_id AND left(r.exercice_id, length(ex.exam_id)+2)=ex.exam_id||'__'
        AND r.status='submitted' AND jsonb_typeof(r.reponses)='object'
        AND EXISTS (SELECT 1 FROM jsonb_each(r.reponses) x WHERE x.value::text NOT IN ('null','""','[]','{}'))) ns,
    coalesce((SELECT rq FROM req WHERE req.quiz_id=ex.exam_id),0) rq
    FROM ex)
  SELECT (SELECT count(*) FROM per)=6
     AND (SELECT count(*) FROM per WHERE v2 OR (rq>0 AND (nm>=rq OR ns>=rq)))=6;
$$;
REVOKE ALL ON FUNCTION public.examens_blancs_preuve_soumission(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.examens_blancs_preuve_soumission(uuid,integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.garde_preuve_examens_blancs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.module_id NOT IN (35,36,37,38) OR NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status='completed' THEN RETURN NEW; END IF;  -- historique jamais touché
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF public.examens_blancs_preuve_soumission(NEW.apprenant_id, NEW.module_id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'MODULE_INCOMPLET: examens blancs 6/6 non soumis (module %)', NEW.module_id USING ERRCODE='P0501';
END;
$$;

CREATE TRIGGER trg_01_garde_preuve_examens_blancs
BEFORE INSERT OR UPDATE ON public.apprenant_module_completion
FOR EACH ROW EXECUTE FUNCTION public.garde_preuve_examens_blancs();