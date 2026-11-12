-- REVIEW ONLY. Not a migration; install only after explicit approval and live-contract tests.
CREATE OR REPLACE FUNCTION public.bilan_revision_finaliser(p_exercice text, p_seq bigint, p_reponses jsonb)
RETURNS public.reponses_apprenants LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reponses_apprenants; s jsonb; rec public.bilan_future_receipts;
BEGIN
  SELECT a.* INTO r FROM public.reponses_apprenants a
    JOIN public.apprenants p ON p.id=a.apprenant_id AND p.auth_user_id=auth.uid()
    WHERE a.exercice_id=p_exercice AND a.exercice_type='bilan_revision' FOR UPDATE OF a;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reprise propriétaire introuvable' USING ERRCODE='42501'; END IF;
  IF r.reponses IS DISTINCT FROM p_reponses THEN RAISE EXCEPTION 'Conflit de réponses' USING ERRCODE='P0555'; END IF;
  IF r.status='submitted' AND r.submitted_at IS NOT NULL THEN RETURN r; END IF;
  IF r.write_seq IS DISTINCT FROM p_seq THEN RAISE EXCEPTION 'Conflit de version' USING ERRCODE='P0555'; END IF;
  s:=r.reponses->'__source';
  SELECT * INTO rec FROM public.bilan_future_receipts
    WHERE id=(s->>'receipt')::uuid AND owner_id=auth.uid() AND version_id=(s->>'version')::uuid
      AND module_id=(s->>'module')::integer AND exercise_id=(s->>'exercise')::integer;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.bilan_future_submissions WHERE receipt_id=rec.id)
    OR s->>'owner' IS DISTINCT FROM r.apprenant_id::text
    OR jsonb_typeof(s->'questions') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'questions')=0
    OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s->'questions') q WHERE
       NOT EXISTS(SELECT 1 FROM public.bilan_future_questions(rec.id)->'questions' qs WHERE qs->>'id'=q)) THEN
    RAISE EXCEPTION 'Source de reprise non confirmée' USING ERRCODE='P0557';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(s->'questions') q WHERE
    NOT r.reponses ? q OR r.reponses->q IN ('null'::jsonb,'[]'::jsonb,'""'::jsonb)) THEN
    RAISE EXCEPTION 'Reprise incomplète' USING ERRCODE='P0558';
  END IF;
  -- Only the separate revision is closed; no grade/result/module write.
  UPDATE public.reponses_apprenants SET completed=true,status='submitted',submitted_at=now() WHERE id=r.id RETURNING * INTO r;
  RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.bilan_revision_finaliser(text,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bilan_revision_finaliser(text,bigint,jsonb) TO authenticated,service_role;