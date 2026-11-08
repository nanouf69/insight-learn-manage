SET LOCAL lock_timeout = '3s';
CREATE TABLE public.revision_fausses_receipts (
  apprenant_id uuid NOT NULL,
  examen_id text NOT NULL,
  revision_exercice_id text NOT NULL,
  result_id uuid NOT NULL REFERENCES public.apprenant_quiz_results(id),
  resultat jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (apprenant_id, examen_id, revision_exercice_id)
);
GRANT SELECT ON public.revision_fausses_receipts TO authenticated;
GRANT ALL ON public.revision_fausses_receipts TO service_role;
ALTER TABLE public.revision_fausses_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY revision_receipt_owner_read ON public.revision_fausses_receipts
FOR SELECT TO authenticated USING (public.core_est_proprietaire(apprenant_id) OR public.has_role(auth.uid(), 'admin'));

-- Covers old clients too; no constraint/backfill on historical results.
CREATE FUNCTION public.revision_fausses_insert_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public SET lock_timeout = '3s' AS $$
DECLARE k text;
BEGIN
  IF NEW.quiz_type <> 'revision_fausses' THEN RETURN NEW; END IF;
  k := NEW.details->>'revision_exercice_id';
  IF k IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.apprenant_id::text || '|' || NEW.quiz_id || '|' || k, 0));
  IF EXISTS (SELECT 1 FROM public.apprenant_quiz_results r WHERE r.apprenant_id=NEW.apprenant_id
    AND r.quiz_id=NEW.quiz_id AND r.quiz_type='revision_fausses' AND r.details->>'revision_exercice_id'=k) THEN
    RAISE EXCEPTION 'Révision déjà finalisée : relire le reçu' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_00_revision_fausses_insert_guard BEFORE INSERT ON public.apprenant_quiz_results
FOR EACH ROW EXECUTE FUNCTION public.revision_fausses_insert_guard();
REVOKE ALL ON FUNCTION public.revision_fausses_insert_guard() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.finaliser_revision_fausses(p_apprenant_id uuid, p_examen_id text, p_revision_exercice_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET lock_timeout = '3s' AS $$
DECLARE preuve public.reponses_apprenants%ROWTYPE; st jsonb; n integer; points numeric;
  resultat public.apprenant_quiz_results%ROWTYPE; rec jsonb; old_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.core_est_proprietaire(p_apprenant_id) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;
  IF p_examen_id IS NULL OR p_revision_exercice_id IS NULL OR NOT
    (p_revision_exercice_id = 'revision_fausses_' || p_examen_id OR
    (left(p_revision_exercice_id,length('revision_fausses_' || p_examen_id || '__r'))='revision_fausses_' || p_examen_id || '__r'
    AND substring(p_revision_exercice_id FROM length('revision_fausses_' || p_examen_id || '__r')+1) ~ '^[0-9]+$')) THEN
    RAISE EXCEPTION 'Identité de révision invalide' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_apprenant_id::text || '|' || p_examen_id || '|' || p_revision_exercice_id,0));
  SELECT r.resultat INTO rec FROM public.revision_fausses_receipts r WHERE r.apprenant_id=p_apprenant_id AND r.examen_id=p_examen_id AND r.revision_exercice_id=p_revision_exercice_id;
  IF FOUND THEN RETURN rec; END IF;
  SELECT * INTO preuve FROM public.reponses_apprenants WHERE apprenant_id=p_apprenant_id
    AND exercice_id=p_revision_exercice_id AND exercice_type='revision_fausses' FOR UPDATE;
  IF NOT FOUND OR preuve.completed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Clôture non confirmée' USING ERRCODE='55000';
  END IF;
  st := preuve.reponses->'revisionState';
  IF st->>'examenId' IS DISTINCT FROM p_examen_id OR jsonb_typeof(st->'questionOrder') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Contexte de révision invalide' USING ERRCODE='22023';
  END IF;
  n := jsonb_array_length(st->'questionOrder');
  points := preuve.score;
  IF n=0 OR points IS NULL OR points<0 OR points>n THEN
    RAISE EXCEPTION 'Score de révision non confirmé' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO old_count FROM public.apprenant_quiz_results WHERE apprenant_id=p_apprenant_id AND quiz_id=p_examen_id
    AND quiz_type='revision_fausses' AND details->>'revision_exercice_id'=p_revision_exercice_id;
  IF old_count>1 THEN RAISE EXCEPTION 'Plusieurs preuves historiques : revue admin requise' USING ERRCODE='21000'; END IF;
  SELECT * INTO resultat FROM public.apprenant_quiz_results WHERE apprenant_id=p_apprenant_id AND quiz_id=p_examen_id
    AND quiz_type='revision_fausses' AND details->>'revision_exercice_id'=p_revision_exercice_id;
  IF NOT FOUND THEN
    INSERT INTO public.apprenant_quiz_results(apprenant_id,user_id,quiz_type,quiz_id,quiz_titre,score_obtenu,score_max,note_sur_20,reussi,details)
    VALUES(p_apprenant_id,preuve.user_id,'revision_fausses',p_examen_id,'Révision questions fausses — ' || p_examen_id,
      points,n,round(points/n*20*2)/2,points=n,jsonb_build_object('reponses',st->'answers','revision_exercice_id',p_revision_exercice_id,'questionOrder',st->'questionOrder'))
    RETURNING * INTO resultat;
  ELSIF resultat.score_obtenu IS DISTINCT FROM points OR resultat.score_max IS DISTINCT FROM n
    OR resultat.details->'reponses' IS DISTINCT FROM st->'answers' OR resultat.details->'questionOrder' IS DISTINCT FROM st->'questionOrder' THEN
    RAISE EXCEPTION 'Preuve historique différente : revue admin requise' USING ERRCODE='21000';
  END IF;
  rec := to_jsonb(resultat);
  INSERT INTO public.revision_fausses_receipts VALUES(p_apprenant_id,p_examen_id,p_revision_exercice_id,resultat.id,rec,now());
  RETURN rec;
END $$;
REVOKE ALL ON FUNCTION public.finaliser_revision_fausses(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finaliser_revision_fausses(uuid,text,text) TO authenticated;
COMMENT ON TABLE public.revision_fausses_receipts IS 'Append-only technical finalization identity; historical results never merged or rewritten.';