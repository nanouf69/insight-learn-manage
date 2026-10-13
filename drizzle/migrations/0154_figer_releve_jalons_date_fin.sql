CREATE OR REPLACE FUNCTION public.figer_releve_jalons(
  _apprenant_id uuid, _payload jsonb, _empreinte text, _methode text, _motif text,
  _nouvelle_version boolean DEFAULT false
) RETURNS public.releve_jalons_gels
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _fin date; _dernier public.releve_jalons_gels; _row public.releve_jalons_gels;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès administrateur requis' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(
    CASE WHEN date_fin_cours_en_ligne ~ '^\d{4}-\d{2}-\d{2}' THEN substr(date_fin_cours_en_ligne, 1, 10)::date END,
    date_fin_formation) INTO _fin
  FROM public.apprenants WHERE id = _apprenant_id;
  IF _fin IS NULL THEN RAISE EXCEPTION 'Date de fin de formation non renseignée' USING ERRCODE = 'P0521'; END IF;
  IF _fin >= (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RAISE EXCEPTION 'Formation non terminée : clôture refusée' USING ERRCODE = 'P0522';
  END IF;
  IF length(btrim(coalesce(_motif, ''))) < 5 THEN RAISE EXCEPTION 'Motif de clôture obligatoire' USING ERRCODE = 'P0523'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('releve_gel:' || _apprenant_id::text));
  SELECT * INTO _dernier FROM public.releve_jalons_gels WHERE apprenant_id = _apprenant_id ORDER BY version DESC LIMIT 1;
  IF FOUND AND (_dernier.empreinte = _empreinte OR NOT _nouvelle_version) THEN
    RETURN _dernier;
  END IF;
  INSERT INTO public.releve_jalons_gels (apprenant_id, version, payload, empreinte, methode, motif, date_fin_formation, remplace_gel_id, cree_par)
  VALUES (_apprenant_id, COALESCE(_dernier.version, 0) + 1, _payload, _empreinte, _methode, _motif, _fin, _dernier.id, auth.uid())
  RETURNING * INTO _row;
  RETURN _row;
END $$;