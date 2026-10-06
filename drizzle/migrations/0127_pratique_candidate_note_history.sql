CREATE TABLE public.pratique_candidate_note_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 apprenant_id uuid NOT NULL REFERENCES public.apprenants(id),
 exam_date text NOT NULL DEFAULT '',
 date_pratique text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1,
 note text NOT NULL DEFAULT '',
 operation_id uuid NOT NULL UNIQUE,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(apprenant_id, exam_date, date_pratique, revision)
);
GRANT SELECT ON public.pratique_candidate_note_revisions TO authenticated;
GRANT SELECT, INSERT ON public.pratique_candidate_note_revisions TO service_role;
ALTER TABLE public.pratique_candidate_note_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read practical note history" ON public.pratique_candidate_note_revisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE FUNCTION public.pratique_note_history_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'Practical note history is append-only' USING ERRCODE='42501'; END; $$;
CREATE TRIGGER pratique_note_history_immutable BEFORE UPDATE OR DELETE ON public.pratique_candidate_note_revisions FOR EACH ROW EXECUTE FUNCTION public.pratique_note_history_immutable();
CREATE FUNCTION public.save_pratique_candidate_note(p_apprenant_id uuid, p_exam_date text, p_date_pratique text, p_note text, p_expected_revision integer, p_operation_id uuid) RETURNS public.pratique_candidate_note_revisions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_revision integer; saved public.pratique_candidate_note_revisions;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF p_exam_date IS NULL OR p_exam_date='' OR p_date_pratique IS NULL OR p_date_pratique='' OR p_note IS NULL OR length(p_note)>2000 OR p_expected_revision IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION 'Invalid note context' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_apprenant_id::text || ':' || p_exam_date || ':' || p_date_pratique,0));
 SELECT * INTO saved FROM public.pratique_candidate_note_revisions WHERE operation_id=p_operation_id;
 IF FOUND THEN
  IF saved.apprenant_id<>p_apprenant_id OR saved.exam_date<>p_exam_date OR saved.date_pratique<>p_date_pratique OR saved.note<>p_note THEN RAISE EXCEPTION 'Operation conflict' USING ERRCODE='P0409'; END IF;
  RETURN saved;
 END IF;
 SELECT coalesce(max(revision),0) INTO current_revision FROM public.pratique_candidate_note_revisions WHERE apprenant_id=p_apprenant_id AND exam_date=p_exam_date AND date_pratique=p_date_pratique;
 IF current_revision<>p_expected_revision THEN RAISE EXCEPTION 'Note modifiée ailleurs : votre saisie est conservée, vérifiez la version enregistrée.' USING ERRCODE='P0409'; END IF;
 INSERT INTO public.pratique_candidate_note_revisions(apprenant_id,exam_date,date_pratique,revision,note,operation_id,created_by) VALUES(p_apprenant_id,p_exam_date,p_date_pratique,current_revision+1,p_note,p_operation_id,auth.uid()) RETURNING * INTO saved;
 RETURN saved;
END; $$;
REVOKE ALL ON FUNCTION public.save_pratique_candidate_note(uuid,text,text,text,integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_pratique_candidate_note(uuid,text,text,text,integer,uuid) TO authenticated;
CREATE FUNCTION public.get_pratique_candidate_notes(p_exam_date text,p_date_pratique text) RETURNS SETOF public.pratique_candidate_note_revisions LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT DISTINCT ON (apprenant_id) * FROM public.pratique_candidate_note_revisions WHERE exam_date=p_exam_date AND date_pratique=p_date_pratique ORDER BY apprenant_id,revision DESC; $$;
REVOKE ALL ON FUNCTION public.get_pratique_candidate_notes(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pratique_candidate_notes(text,text) TO authenticated;