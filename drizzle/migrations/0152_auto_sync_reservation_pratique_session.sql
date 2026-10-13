-- Synchronisation automatique : toute réservation pratique inscrit l'apprenant
-- à la session pratique du jour, en la créant si elle n'existe pas encore.
-- Additif uniquement : aucune suppression, aucune modification de données existantes.

CREATE OR REPLACE FUNCTION public.reservation_pratique_inscrit_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session record;
  v_type text;
BEGIN
  IF NEW.apprenant_id IS NULL OR NEW.date_choisie IS NULL THEN
    RETURN NEW;
  END IF;

  v_type := lower(coalesce(NEW.type_formation, 'vtc'));
  IF v_type NOT IN ('vtc', 'taxi') THEN
    v_type := 'vtc';
  END IF;

  -- 1) Chercher la session pratique du jour (la plus proche du type demandé)
  SELECT id, heure_debut, heure_fin INTO v_session
  FROM public.sessions
  WHERE date_debut = NEW.date_choisie
    AND type_session LIKE 'pratique%'
  ORDER BY (type_session = 'pratique_' || v_type) DESC, created_at
  LIMIT 1;

  -- 2) La créer si elle n'existe pas encore (le planning fait foi)
  IF v_session.id IS NULL THEN
    BEGIN
      INSERT INTO public.sessions (
        nom, type_session, date_debut, date_fin,
        heure_debut, heure_fin, lieu, statut,
        places_disponibles, types_apprenant
      )
      VALUES (
        'Formation pratique ' || upper(v_type) || ' - ' || to_char(NEW.date_choisie, 'DD/MM/YYYY'),
        'pratique_' || v_type,
        NEW.date_choisie, NEW.date_choisie,
        '09:00', '12:00',
        '86 Route de Genas, 69003 Lyon',
        'planifiee',
        3,
        ARRAY[upper(v_type)]
      )
      RETURNING id, heure_debut, heure_fin INTO v_session;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'reservation_pratique_inscrit_session: session non créée (%)', SQLSTATE;
      RETURN NEW; -- la réservation n'est jamais bloquée
    END;
  END IF;

  -- 3) Inscrire l'apprenant (idempotent)
  BEGIN
    INSERT INTO public.session_apprenants (
      session_id, apprenant_id, montant_total, montant_paye,
      mode_financement, heure_debut_personnalisee, heure_fin_personnalisee
    )
    VALUES (
      v_session.id, NEW.apprenant_id, 0, 0,
      'personnel', v_session.heure_debut, v_session.heure_fin
    )
    ON CONFLICT (session_id, apprenant_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reservation_pratique_inscrit_session: inscription non faite (%)', SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

-- Le déclencheur doit aussi réagir au changement de type ou d'apprenant
DROP TRIGGER IF EXISTS trg_reservation_pratique_inscrit_session ON public.reservations_pratique;
CREATE TRIGGER trg_reservation_pratique_inscrit_session
AFTER INSERT OR UPDATE OF date_choisie, type_formation, apprenant_id
ON public.reservations_pratique
FOR EACH ROW
EXECUTE FUNCTION public.reservation_pratique_inscrit_session();