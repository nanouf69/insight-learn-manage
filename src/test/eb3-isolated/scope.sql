-- TEST ONLY: prospective scope prototype, NOT a deployable migration.
-- The active start/revision handlers DO NOT yet provide the required immutable roster.
CREATE TABLE public.eb_revision_activation_candidate (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  activated_at timestamptz NOT NULL
);
GRANT SELECT ON public.eb_revision_activation_candidate TO authenticated;
GRANT ALL ON public.eb_revision_activation_candidate TO service_role;
ALTER TABLE public.eb_revision_activation_candidate ENABLE ROW LEVEL SECURITY;
-- No client access policy: activation cannot be supplied by a learner.

CREATE TABLE public.eb_original_candidate (
  original_id uuid PRIMARY KEY,
  apprenant_id uuid NOT NULL,
  examen_id text NOT NULL,
  started_at timestamptz NOT NULL
);
GRANT SELECT ON public.eb_original_candidate TO authenticated;
GRANT ALL ON public.eb_original_candidate TO service_role;
ALTER TABLE public.eb_original_candidate ENABLE ROW LEVEL SECURITY;
-- Prototype only: active core_start_attempt does not produce this parent identity.

CREATE TABLE public.eb_revision_sources_candidate (
  apprenant_id uuid NOT NULL,
  examen_id text NOT NULL,
  revision_exercice_id text NOT NULL,
  matiere_id text NOT NULL,
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts_v2(attempt_id),
  original_id uuid NOT NULL REFERENCES public.eb_original_candidate(original_id),
  PRIMARY KEY(apprenant_id,examen_id,revision_exercice_id,matiere_id),
  UNIQUE(apprenant_id,examen_id,revision_exercice_id,attempt_id)
);
GRANT SELECT ON public.eb_revision_sources_candidate TO authenticated;
GRANT ALL ON public.eb_revision_sources_candidate TO service_role;
ALTER TABLE public.eb_revision_sources_candidate ENABLE ROW LEVEL SECURITY;
-- No write grant/policy for clients. Population must eventually use a verified server handler.

CREATE FUNCTION public.eb_revision_scope_candidate(p_apprenant uuid,p_examen text,p_revision text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE activation timestamptz; n integer; originals integer; safe boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.core_est_proprietaire(p_apprenant) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  IF p_examen IS NULL OR p_examen NOT IN ('EB3','EB4','EB5','EB6','EB3-TAXI','EB4-TAXI','EB5-TAXI','EB6-TAXI') THEN RETURN false; END IF;
  SELECT activated_at INTO activation FROM public.eb_revision_activation_candidate WHERE singleton;
  IF activation IS NULL THEN RETURN false; END IF;
  -- The seven source subjects belong to the ORIGINAL exam, including those with no wrong answers.
  SELECT count(*),count(DISTINCT s.original_id),bool_and(
    a.apprenant_id=p_apprenant AND a.exam_id=p_examen
    AND o.apprenant_id=p_apprenant AND o.examen_id=p_examen AND o.started_at>activation
    AND a.started_at>activation
    AND a.is_test=false
    AND a.snapshot_fingerprint IS NOT NULL AND btrim(a.snapshot_fingerprint)<>''
    AND CASE WHEN jsonb_typeof(a.snapshot->'questions')='array' THEN jsonb_array_length(a.snapshot->'questions')>0 ELSE false END
    AND a.snapshot->>'matiere'=s.matiere_id
  ) INTO n,originals,safe
  FROM public.eb_revision_sources_candidate s JOIN public.exam_attempts_v2 a USING(attempt_id)
  JOIN public.eb_original_candidate o USING(original_id)
  WHERE s.apprenant_id=p_apprenant AND s.examen_id=p_examen AND s.revision_exercice_id=p_revision;
  RETURN n=7 AND originals=1 AND coalesce(safe,false);
END $$;
REVOKE ALL ON FUNCTION public.eb_revision_scope_candidate(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.eb_revision_scope_candidate(uuid,text,text) TO authenticated;
-- Does NOT install the previous global result guard or close any copy.