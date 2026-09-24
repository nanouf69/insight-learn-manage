CREATE OR REPLACE FUNCTION public.decaler_examen_theorique(p_operation_id uuid, p_apprenant_id uuid, p_ancienne_date text, p_nouvelle_date text, p_nouvelle_iso date, p_nouveau_lieu text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS examen_theorique_decalages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.examen_theorique_decalages;
  v_app record;
  v_old_session uuid;
  v_new_session uuid;
  v_link_old uuid;
  v_link_new uuid;
  v_closes integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'DECALAGE_REFUSE: action reservee a un administrateur.' USING ERRCODE = 'P0496';
  END IF;

  SELECT * INTO v_row FROM public.examen_theorique_decalages WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_row; END IF;

  SELECT id, nom, prenom, type_apprenant, date_examen_theorique INTO v_app
    FROM public.apprenants WHERE id = p_apprenant_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DECALAGE_REFUSE: apprenant introuvable.' USING ERRCODE = 'P0497';
  END IF;

  IF coalesce(v_app.date_examen_theorique, '') <> p_ancienne_date THEN
    RAISE EXCEPTION 'DECALAGE_REFUSE: la session actuelle du candidat (%) ne correspond plus a %. Rechargez la page.',
      coalesce(v_app.date_examen_theorique, 'aucune'), p_ancienne_date USING ERRCODE = 'P0498';
  END IF;
  IF p_nouvelle_date = p_ancienne_date THEN
    RAISE EXCEPTION 'DECALAGE_REFUSE: nouvelle session identique.' USING ERRCODE = 'P0498';
  END IF;

  UPDATE public.apprenants SET date_examen_theorique = p_nouvelle_date WHERE id = p_apprenant_id;

  SELECT s.id INTO v_old_session FROM public.sessions s
   JOIN public.session_apprenants sa ON sa.session_id = s.id AND sa.apprenant_id = p_apprenant_id
   WHERE s.type_session = 'examen' AND s.nom = 'Session examen — ' || p_ancienne_date LIMIT 1;

  SELECT id INTO v_new_session FROM public.sessions
   WHERE type_session = 'examen' AND date_debut = p_nouvelle_iso ORDER BY created_at LIMIT 1;
  IF v_new_session IS NULL THEN
    INSERT INTO public.sessions (nom, date_debut, date_fin, lieu, type_session, statut, places_disponibles,
                                 types_apprenant, creneaux, heure_debut, heure_fin)
    VALUES ('Session examen — ' || p_nouvelle_date, p_nouvelle_iso, p_nouvelle_iso, p_nouveau_lieu, 'examen',
            'planifiee', 200, '{}'::text[], '{}'::text[], '14:00', '16:00')
    RETURNING id INTO v_new_session;
  END IF;

  SELECT id INTO v_link_new FROM public.session_apprenants
   WHERE session_id = v_new_session AND apprenant_id = p_apprenant_id;
  IF v_old_session IS NOT NULL THEN
    SELECT id INTO v_link_old FROM public.session_apprenants
     WHERE session_id = v_old_session AND apprenant_id = p_apprenant_id;
  END IF;

  IF v_link_old IS NOT NULL AND v_link_new IS NULL THEN
    UPDATE public.session_apprenants
       SET session_id = v_new_session, date_debut = p_nouvelle_iso, date_fin = p_nouvelle_iso
     WHERE id = v_link_old;
  ELSIF v_link_old IS NOT NULL AND v_link_new IS NOT NULL THEN
    UPDATE public.session_apprenants SET statut_suivi = 'decale_examen' WHERE id = v_link_old;
  ELSIF v_link_new IS NULL THEN
    INSERT INTO public.session_apprenants (session_id, apprenant_id, date_debut, date_fin)
    VALUES (v_new_session, p_apprenant_id, p_nouvelle_iso, p_nouvelle_iso);
  END IF;

  UPDATE public.demandes_inscription_urgentes
     SET statut = 'traitee', traitee_at = now(), traitee_par = auth.uid()
   WHERE apprenant_id = p_apprenant_id AND statut = 'a_traiter'
     AND examen_libelle ILIKE '%' || p_ancienne_date || '%';
  GET DIAGNOSTICS v_closes = ROW_COUNT;

  INSERT INTO public.examen_theorique_decalages
    (operation_id, apprenant_id, apprenant_nom, apprenant_prenom, type_apprenant, ancienne_date, nouvelle_date,
     ancienne_session_id, nouvelle_session_id, demandes_urgentes_closes, auteur, auteur_email)
  VALUES (p_operation_id, p_apprenant_id, v_app.nom, v_app.prenom, v_app.type_apprenant, p_ancienne_date,
          p_nouvelle_date, v_old_session, v_new_session, v_closes, auth.uid(), p_email)
  RETURNING * INTO v_row;
  RETURN v_row;
END $function$;