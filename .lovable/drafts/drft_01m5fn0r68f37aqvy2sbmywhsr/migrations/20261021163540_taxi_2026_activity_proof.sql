-- Additive guard ONLY for the three new IDs; no existing row is rewritten.
CREATE FUNCTION public.garde_activites_taxi_2026_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE champs text[]; k text;
BEGIN
  IF NEW.exercice_id NOT IN ('jeu_taxi_2026_feries_v1','jeu_taxi_2026_tarifs_v1','jeu_taxi_2026_rtst_v1') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Activité TAXI déjà validée : preuve conservée' USING ERRCODE='42501';
  END IF;
  IF NEW.score IS NOT NULL THEN RAISE EXCEPTION 'Activités TAXI non notées' USING ERRCODE='23514'; END IF;
  IF NEW.reponses->>'version' IS DISTINCT FROM '2026-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object'
    OR coalesce(NEW.reponses->>'revision','')='' THEN
    RAISE EXCEPTION 'Version ou identité de saisie TAXI manquante' USING ERRCODE='23514';
  END IF;
  IF NEW.completed IS TRUE THEN
    IF NEW.exercice_id='jeu_taxi_2026_feries_v1' THEN
      SELECT array_agg('f'||lpad(n::text,2,'0')) INTO champs FROM generate_series(1,11) n;
    ELSIF NEW.exercice_id='jeu_taxi_2026_tarifs_v1' THEN
      SELECT array_agg('t'||lpad(n::text,2,'0')) INTO champs FROM generate_series(1,30) n;
    ELSE
      SELECT array_agg('s'||lpad(n::text,2,'0')||'_'||c) INTO champs FROM generate_series(1,13) n CROSS JOIN unnest(ARRAY['r','tarif','s','attente']) c;
    END IF;
    FOREACH k IN ARRAY champs LOOP
      IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string' OR btrim(coalesce(NEW.reponses->'valeurs'->>k,''))='' THEN
        RAISE EXCEPTION 'Activité TAXI incomplète : %',k USING ERRCODE='23514';
      END IF;
      IF NEW.exercice_id='jeu_taxi_2026_tarifs_v1' AND NEW.reponses->'valeurs'->>k !~ '^[0-3]$' THEN
        RAISE EXCEPTION 'Choix TAXI invalide' USING ERRCODE='23514';
      END IF;
      IF NEW.exercice_id='jeu_taxi_2026_feries_v1' AND NEW.reponses->'valeurs'->>k !~ '^2026-[0-9]{2}-[0-9]{2}$' THEN
        RAISE EXCEPTION 'Date TAXI invalide' USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.garde_activites_taxi_2026_v1() FROM PUBLIC;
CREATE TRIGGER trg_garde_activites_taxi_2026_v1 BEFORE INSERT OR UPDATE ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.garde_activites_taxi_2026_v1();

CREATE FUNCTION public.activites_taxi_2026_protection_prete()
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_garde_activites_taxi_2026_v1' AND tgenabled='O');
$$;
REVOKE ALL ON FUNCTION public.activites_taxi_2026_protection_prete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activites_taxi_2026_protection_prete() TO authenticated, service_role;