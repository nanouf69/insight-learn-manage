CREATE OR REPLACE FUNCTION public.auto_inscription_taxi_vtc_taxi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; v record; t text;
BEGIN
  SELECT lower(coalesce(type_apprenant,'')) INTO t FROM apprenants WHERE id = NEW.apprenant_id;
  IF t <> 'taxi' THEN RETURN NEW; END IF;
  SELECT * INTO s FROM sessions WHERE id = NEW.session_id;
  IF s.nom IS NULL OR s.nom NOT ILIKE '%TAXI et TA%' THEN RETURN NEW; END IF;
  FOR v IN SELECT id FROM sessions
    WHERE nom ILIKE '%VTC et TAXI%' AND id <> s.id
      AND date_debut <= s.date_fin AND date_fin >= s.date_debut
  LOOP
    BEGIN
      INSERT INTO session_apprenants(session_id, apprenant_id, mode_financement)
      SELECT v.id, NEW.apprenant_id, NEW.mode_financement
      WHERE NOT EXISTS (SELECT 1 FROM session_apprenants x WHERE x.session_id = v.id AND x.apprenant_id = NEW.apprenant_id);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'auto inscription VTC et TAXI ignorée: %', SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_auto_inscription_taxi_vtc_taxi
AFTER INSERT ON public.session_apprenants
FOR EACH ROW EXECUTE FUNCTION public.auto_inscription_taxi_vtc_taxi();