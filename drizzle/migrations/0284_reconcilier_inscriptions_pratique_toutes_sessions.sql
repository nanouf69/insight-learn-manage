CREATE OR REPLACE FUNCTION public.reconcilier_inscriptions_pratique(p_depuis date DEFAULT NULL::date)
RETURNS TABLE(out_apprenant_id uuid, out_date_pratique date, out_session_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  r record;
  v_cible record;
  h record;
  v_depuis date := coalesce(p_depuis, (now() AT TIME ZONE 'Europe/Paris')::date);
  v_id uuid;
  v_debut text;
  v_fin text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Réservé aux administrateurs';
  END IF;

  FOR r IN
    SELECT rp.apprenant_id AS app_id, rp.date_choisie AS d,
           lower(coalesce(rp.type_formation, 'vtc')) AS t, rp.creneau AS cren
    FROM public.reservations_pratique rp
    JOIN public.apprenants a ON a.id = rp.apprenant_id AND a.deleted_at IS NULL
    WHERE rp.date_choisie >= v_depuis
    ORDER BY rp.date_choisie, rp.apprenant_id
  LOOP
    SELECT min(x.debut) AS debut, max(x.fin) AS fin INTO h
    FROM public.pratique_creneaux_planifies(r.d, r.cren) x;
    IF h.debut IS NULL THEN CONTINUE; END IF;
    v_debut := to_char(h.debut, 'HH24:MI');
    v_fin := to_char(h.fin, 'HH24:MI');

    FOR v_cible IN
      SELECT s.id
      FROM public.sessions s
      WHERE s.date_debut = r.d
        AND coalesce(s.statut, '') NOT ILIKE '%annul%'
        AND (s.type_session = 'pratique' OR s.type_session = 'pratique_' || r.t)
      ORDER BY s.created_at, s.id
    LOOP
      UPDATE public.sessions AS s
      SET heure_debut = v_debut, heure_fin = v_fin
      WHERE s.id = v_cible.id
        AND (s.heure_debut IS DISTINCT FROM v_debut OR s.heure_fin IS DISTINCT FROM v_fin);

      v_id := NULL;
      INSERT INTO public.session_apprenants AS sa(
        session_id, apprenant_id, montant_total, montant_paye, mode_financement,
        heure_debut_personnalisee, heure_fin_personnalisee
      )
      VALUES (v_cible.id, r.app_id, 0, 0, 'personnel', v_debut, v_fin)
      ON CONFLICT (session_id, apprenant_id) DO NOTHING
      RETURNING sa.id INTO v_id;

      IF v_id IS NOT NULL THEN
        out_apprenant_id := r.app_id;
        out_date_pratique := r.d;
        out_session_id := v_cible.id;
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END
$function$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_apprenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_pratique_config;