CREATE OR REPLACE FUNCTION public.fc_sync_dates_inscrit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT id, nom, date_debut, date_fin INTO s FROM sessions WHERE id = NEW.session_id;
  IF s.id IS NULL OR s.date_debut IS NULL OR s.nom NOT ILIKE 'formation continue%' THEN
    RETURN NEW;
  END IF;
  UPDATE apprenants SET
    date_debut_formation = to_char(s.date_debut,'YYYY-MM-DD'),
    date_fin_formation = to_char(COALESCE(s.date_fin, s.date_debut),'YYYY-MM-DD'),
    date_debut_cours_en_ligne = s.date_debut,
    date_fin_cours_en_ligne = COALESCE(s.date_fin, s.date_debut)
  WHERE id = NEW.apprenant_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fc_sync_dates_inscrit
AFTER INSERT ON public.session_apprenants
FOR EACH ROW EXECUTE FUNCTION public.fc_sync_dates_inscrit();

CREATE OR REPLACE FUNCTION public.fc_sync_dates_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.nom ILIKE 'formation continue%' AND NEW.date_debut IS NOT NULL
     AND (NEW.date_debut IS DISTINCT FROM OLD.date_debut OR NEW.date_fin IS DISTINCT FROM OLD.date_fin) THEN
    UPDATE apprenants a SET
      date_debut_formation = to_char(NEW.date_debut,'YYYY-MM-DD'),
      date_fin_formation = to_char(COALESCE(NEW.date_fin, NEW.date_debut),'YYYY-MM-DD'),
      date_debut_cours_en_ligne = NEW.date_debut,
      date_fin_cours_en_ligne = COALESCE(NEW.date_fin, NEW.date_debut)
    FROM session_apprenants sa
    WHERE sa.session_id = NEW.id AND sa.apprenant_id = a.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fc_sync_dates_session
AFTER UPDATE OF date_debut, date_fin ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.fc_sync_dates_session();