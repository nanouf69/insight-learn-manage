-- Planning pratique = source de vérité : toute réservation inscrit l'élève dans la session pratique
-- existante du même jour (ajout seulement, jamais de suppression ni de modification d'inscription).
CREATE OR REPLACE FUNCTION public.reservation_pratique_inscrit_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_session record;
BEGIN
  IF NEW.apprenant_id IS NULL OR NEW.date_choisie IS NULL THEN RETURN NEW; END IF;
  SELECT id, heure_debut, heure_fin INTO v_session FROM public.sessions
   WHERE date_debut = NEW.date_choisie AND type_session LIKE 'pratique%'
   ORDER BY (type_session = 'pratique_' || lower(coalesce(NEW.type_formation,'vtc'))) DESC, created_at
   LIMIT 1;
  IF v_session.id IS NULL THEN RETURN NEW; END IF; -- session créée ensuite par la synchronisation du planning
  BEGIN
    INSERT INTO public.session_apprenants (session_id, apprenant_id, montant_total, montant_paye, mode_financement, heure_debut_personnalisee, heure_fin_personnalisee)
    VALUES (v_session.id, NEW.apprenant_id, 0, 0, 'personnel', v_session.heure_debut, v_session.heure_fin)
    ON CONFLICT (session_id, apprenant_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reservation_pratique_inscrit_session: inscription non faite (%)', SQLSTATE; -- la réservation n'est jamais bloquée
  END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.reservation_pratique_inscrit_session() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_reservation_pratique_inscrit_session ON public.reservations_pratique;
CREATE TRIGGER trg_reservation_pratique_inscrit_session
AFTER INSERT OR UPDATE OF date_choisie ON public.reservations_pratique
FOR EACH ROW EXECUTE FUNCTION public.reservation_pratique_inscrit_session();