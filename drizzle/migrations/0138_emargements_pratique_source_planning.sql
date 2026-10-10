
CREATE OR REPLACE FUNCTION public.generer_emargements_planning_pratique(p_apprenant_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r RECORD; slot jsonb; cren text; nb integer := 0; parts text[];
BEGIN
  FOR r IN
    SELECT rp.apprenant_id, rp.date_choisie, lower(coalesce(rp.creneau,'journee')) AS creneau, ap.auth_user_id
      FROM public.reservations_pratique rp
      JOIN public.apprenants ap ON ap.id = rp.apprenant_id
     WHERE (p_apprenant_id IS NULL OR rp.apprenant_id = p_apprenant_id)
       AND ap.auth_user_id IS NOT NULL AND ap.deleted_at IS NULL
       AND COALESCE(ap.abandonnee,false) = false
  LOOP
    slot := NULL;
    SELECT c.day_time_slots -> r.date_choisie::text INTO slot
      FROM public.planning_pratique_config c
     WHERE c.day_time_slots ? r.date_choisie::text
     ORDER BY c.updated_at DESC LIMIT 1;
    IF slot IS NULL THEN CONTINUE; END IF;
    parts := ARRAY[]::text[];
    IF r.creneau LIKE '%apres%' OR r.creneau LIKE '%aprem%' THEN parts := ARRAY['apres_midi']::text[];
    ELSIF r.creneau LIKE '%matin%' THEN parts := ARRAY['matin']::text[];
    ELSIF jsonb_typeof(slot)='object' AND (coalesce(slot->>'matin','')<>'' OR coalesce(slot->>'apresmidi','')<>'') THEN
      IF coalesce(slot->>'matin','')<>'' THEN parts := array_append(parts, 'matin'::text); END IF;
      IF coalesce(slot->>'apresmidi','')<>'' THEN parts := array_append(parts, 'apres_midi'::text); END IF;
    ELSE parts := ARRAY['matin','apres_midi']::text[];
    END IF;
    FOREACH cren IN ARRAY parts LOOP
      INSERT INTO public.emargements_fc (apprenant_id, user_id, date_emargement, demi_journee)
      VALUES (r.apprenant_id, r.auth_user_id, r.date_choisie, cren)
      ON CONFLICT (apprenant_id, date_emargement, demi_journee) DO NOTHING;
      IF FOUND THEN nb := nb + 1; END IF;
    END LOOP;
  END LOOP;
  RETURN nb;
END $$;

CREATE OR REPLACE FUNCTION public.generer_emargements_session(p_session_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s RECORD; a RECORD; d date; cren text; creneaux_session text[]; est_soir boolean; nb integer := 0;
BEGIN
  SELECT id, date_debut, date_fin, nom, creneaux, type_session INTO s FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND OR s.date_debut IS NULL THEN RETURN 0; END IF;
  IF lower(COALESCE(s.type_session,'')) <> 'theorique' THEN RETURN 0; END IF;
  est_soir := COALESCE(s.nom,'') ILIKE '%soir%'
    OR EXISTS (SELECT 1 FROM unnest(COALESCE(s.creneaux, ARRAY[]::text[])) c WHERE c ILIKE '%soir%');
  creneaux_session := CASE WHEN est_soir THEN ARRAY['soir_1','soir_2']::text[] ELSE ARRAY['matin','apres_midi']::text[] END;
  FOR a IN
    SELECT ap.id AS apprenant_id, ap.auth_user_id FROM public.session_apprenants sa
      JOIN public.apprenants ap ON ap.id = sa.apprenant_id
     WHERE sa.session_id = p_session_id AND ap.auth_user_id IS NOT NULL
       AND COALESCE(ap.abandonnee,false)=false AND ap.deleted_at IS NULL
       AND COALESCE(sa.liste_attente,false)=false
  LOOP
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
  END LOOP;
  RETURN nb;
END $$;

CREATE OR REPLACE FUNCTION public.trg_generer_emargements_sur_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN PERFORM public.generer_emargements_planning_pratique(NEW.apprenant_id);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'emargements pratique: %', SQLERRM; END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_emargements_auto_reservation ON public.reservations_pratique;
CREATE TRIGGER trg_emargements_auto_reservation AFTER INSERT OR UPDATE OF date_choisie, creneau
  ON public.reservations_pratique FOR EACH ROW EXECUTE FUNCTION public.trg_generer_emargements_sur_reservation();

CREATE OR REPLACE FUNCTION public.trg_generer_emargements_sur_planning()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN PERFORM public.generer_emargements_planning_pratique(NULL);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'emargements planning: %', SQLERRM; END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_emargements_auto_planning ON public.planning_pratique_config;
CREATE TRIGGER trg_emargements_auto_planning AFTER INSERT OR UPDATE OF day_time_slots
  ON public.planning_pratique_config FOR EACH ROW EXECUTE FUNCTION public.trg_generer_emargements_sur_planning();

REVOKE EXECUTE ON FUNCTION public.generer_emargements_planning_pratique(uuid) FROM PUBLIC, anon, authenticated;

SELECT public.generer_emargements_planning_pratique(NULL);

UPDATE public.emargements_fc e
   SET masque = true, masque_motif = 'Généré à tort : jour d''examen, aucune formation prévue (10/10/2026)', masque_at = now()
 WHERE e.date_emargement = '2026-11-17' AND COALESCE(e.masque,false)=false
   AND COALESCE(e.signature_data_url,'') = '' AND COALESCE(e.absent,false)=false AND e.signed_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id=sa.session_id
        WHERE sa.apprenant_id=e.apprenant_id AND s.type_session='theorique'
          AND e.date_emargement BETWEEN s.date_debut AND COALESCE(s.date_fin,s.date_debut))
   AND NOT EXISTS (SELECT 1 FROM public.reservations_pratique r WHERE r.apprenant_id=e.apprenant_id AND r.date_choisie=e.date_emargement);
