CREATE OR REPLACE FUNCTION public.reconcilier_inscriptions_pratique(p_depuis date DEFAULT NULL)
RETURNS TABLE(apprenant_id uuid, date_pratique date, session_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r record; v_session uuid; h record; v_depuis date := coalesce(p_depuis, (now() AT TIME ZONE 'Europe/Paris')::date); v_id uuid;
BEGIN
  -- Planning pratique = référence : ajoute seulement les inscriptions manquantes, ne retire ni ne modifie rien.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Réservé aux administrateurs';
  END IF;
  FOR r IN
    SELECT rp.apprenant_id, rp.date_choisie, lower(coalesce(rp.type_formation,'vtc')) t, rp.creneau
    FROM public.reservations_pratique rp
    JOIN public.apprenants a ON a.id = rp.apprenant_id AND a.deleted_at IS NULL
    WHERE rp.date_choisie >= v_depuis
      AND NOT EXISTS (
        SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id = sa.session_id
        WHERE sa.apprenant_id = rp.apprenant_id AND s.date_debut = rp.date_choisie
          AND s.type_session LIKE 'pratique%' AND coalesce(s.statut,'') NOT ILIKE '%annul%')
  LOOP
    SELECT s.id INTO v_session FROM public.sessions s
    WHERE s.date_debut = r.date_choisie AND s.type_session LIKE 'pratique%' AND coalesce(s.statut,'') NOT ILIKE '%annul%'
    ORDER BY (s.type_session = 'pratique_'||r.t) DESC, s.created_at LIMIT 1;
    IF v_session IS NULL THEN CONTINUE; END IF;
    SELECT min(debut) debut, max(fin) fin INTO h FROM public.pratique_creneaux_planifies(r.date_choisie, r.creneau);
    IF h.debut IS NULL THEN CONTINUE; END IF;
    v_id := NULL;
    INSERT INTO public.session_apprenants(session_id, apprenant_id, montant_total, montant_paye, mode_financement, heure_debut_personnalisee, heure_fin_personnalisee)
    VALUES (v_session, r.apprenant_id, 0, 0, 'personnel', to_char(h.debut,'HH24:MI'), to_char(h.fin,'HH24:MI'))
    ON CONFLICT (session_id, apprenant_id) DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      apprenant_id := r.apprenant_id; date_pratique := r.date_choisie; session_id := v_session; RETURN NEXT;
    END IF;
  END LOOP;
END $function$;

REVOKE ALL ON FUNCTION public.reconcilier_inscriptions_pratique(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcilier_inscriptions_pratique(date) TO authenticated, service_role;