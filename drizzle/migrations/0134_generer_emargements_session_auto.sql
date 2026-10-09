
-- Génération automatique et strictement additive des feuilles d'émargement.
-- Une ligne par élève inscrit x jour x créneau, signature vide (feuille "à signer").
-- Jamais d'écrasement : ON CONFLICT DO NOTHING sur emargements_fc_unique_per_half_day.

CREATE OR REPLACE FUNCTION public.generer_emargements_session(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  a RECORD;
  d date;
  cren text;
  creneaux_session text[];
  est_soir boolean;
  nb integer := 0;
BEGIN
  SELECT id, date_debut, date_fin, nom, creneaux, type_session
    INTO s
    FROM public.sessions
   WHERE id = p_session_id;
  IF NOT FOUND OR s.date_debut IS NULL THEN
    RETURN 0;
  END IF;

  est_soir := COALESCE(s.nom, '') ILIKE '%soir%'
    OR EXISTS (
      SELECT 1 FROM unnest(COALESCE(s.creneaux, ARRAY[]::text[])) AS c WHERE c ILIKE '%soir%'
    );
  creneaux_session := CASE WHEN est_soir
    THEN ARRAY['soir_1','soir_2']::text[]
    ELSE ARRAY['matin','apres_midi']::text[]
  END;

  FOR a IN
    SELECT ap.id AS apprenant_id, ap.auth_user_id
      FROM public.session_apprenants sa
      JOIN public.apprenants ap ON ap.id = sa.apprenant_id
     WHERE sa.session_id = p_session_id
       AND ap.auth_user_id IS NOT NULL
       AND COALESCE(ap.abandonnee, false) = false
       AND ap.deleted_at IS NULL
       AND COALESCE(sa.liste_attente, false) = false
  LOOP
    IF COALESCE(s.type_session, '') = 'pratique' THEN
      -- Session pratique : uniquement les jours réservés par l'élève.
      FOR d IN
        SELECT r.date_choisie FROM public.reservations_pratique r
         WHERE r.apprenant_id = a.apprenant_id
      LOOP
        FOREACH cren IN ARRAY ARRAY['matin','apres_midi']::text[] LOOP
          INSERT INTO public.emargements_fc (apprenant_id, user_id, date_emargement, demi_journee)
          VALUES (a.apprenant_id, a.auth_user_id, d, cren)
          ON CONFLICT (apprenant_id, date_emargement, demi_journee) DO NOTHING;
          IF FOUND THEN nb := nb + 1; END IF;
        END LOOP;
      END LOOP;
    ELSE
      -- Session classique : jours ouvrés (lun-ven) entre début et fin.
      d := s.date_debut;
      WHILE d <= COALESCE(s.date_fin, s.date_debut) LOOP
        IF extract(isodow FROM d) BETWEEN 1 AND 5 THEN
          FOREACH cren IN ARRAY creneaux_session LOOP
            INSERT INTO public.emargements_fc (apprenant_id, user_id, date_emargement, demi_journee)
            VALUES (a.apprenant_id, a.auth_user_id, d, cren)
            ON CONFLICT (apprenant_id, date_emargement, demi_journee) DO NOTHING;
            IF FOUND THEN nb := nb + 1; END IF;
          END LOOP;
        END IF;
        d := d + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN nb;
END;
$$;

-- Déclencheur : inscription d'un élève dans une session.
CREATE OR REPLACE FUNCTION public.trg_generer_emargements_sur_inscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generer_emargements_session(NEW.session_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emargements_auto_inscription ON public.session_apprenants;
CREATE TRIGGER trg_emargements_auto_inscription
AFTER INSERT ON public.session_apprenants
FOR EACH ROW EXECUTE FUNCTION public.trg_generer_emargements_sur_inscription();

-- Déclencheur : création ou changement de dates/créneaux d'une session.
CREATE OR REPLACE FUNCTION public.trg_generer_emargements_sur_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generer_emargements_session(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emargements_auto_session ON public.sessions;
CREATE TRIGGER trg_emargements_auto_session
AFTER INSERT OR UPDATE OF date_debut, date_fin, creneaux, nom, type_session ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_generer_emargements_sur_session();

-- Déclencheur : réservation d'un jour pratique par un élève.
CREATE OR REPLACE FUNCTION public.trg_generer_emargements_sur_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT auth_user_id INTO uid FROM public.apprenants WHERE id = NEW.apprenant_id;
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.emargements_fc (apprenant_id, user_id, date_emargement, demi_journee)
  VALUES
    (NEW.apprenant_id, uid, NEW.date_choisie, 'matin'),
    (NEW.apprenant_id, uid, NEW.date_choisie, 'apres_midi')
  ON CONFLICT (apprenant_id, date_emargement, demi_journee) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emargements_auto_reservation ON public.reservations_pratique;
CREATE TRIGGER trg_emargements_auto_reservation
AFTER INSERT ON public.reservations_pratique
FOR EACH ROW EXECUTE FUNCTION public.trg_generer_emargements_sur_reservation();
