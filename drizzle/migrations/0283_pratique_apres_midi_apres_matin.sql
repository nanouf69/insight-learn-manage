CREATE OR REPLACE FUNCTION public.emargement_pratique_matin_signe(p_apprenant_id uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT EXISTS(SELECT 1 FROM emargements_fc e WHERE e.apprenant_id=p_apprenant_id AND e.date_emargement=p_date AND e.demi_journee='matin' AND NOT coalesce(e.absent,false) AND NOT coalesce(e.masque,false) AND coalesce(btrim(e.signature_data_url),'')<>'')
$$;
REVOKE ALL ON FUNCTION public.emargement_pratique_matin_signe(uuid,date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.emargement_controle_creneau(p_apprenant_id uuid, p_date date, p_creneau text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT coalesce((SELECT jsonb_build_object('autorise',
  r.date_cours<(now() AT TIME ZONE 'Europe/Paris')::date
  OR (r.date_cours=(now() AT TIME ZONE 'Europe/Paris')::date AND (public.emargement_fenetre_ouverte(r.date_cours,r.debut,now())
      OR (r.pratique AND r.creneau='apres_midi' AND public.emargement_pratique_matin_signe(p_apprenant_id,r.date_cours)))),
  'debut',r.debut,'fin',r.fin,'pratique',r.pratique,'ouvre_le',((r.date_cours+r.debut) AT TIME ZONE 'Europe/Paris')-interval '30 minutes')
 FROM public.emargement_creneaux_reels(p_apprenant_id) r WHERE r.date_cours=p_date AND r.creneau=p_creneau),
 jsonb_build_object('autorise',false,'motif','Créneau non prévu pour cette inscription')) $function$;

CREATE OR REPLACE FUNCTION public.emargement_fenetres_eleve(p_apprenant_id uuid)
 RETURNS TABLE(date_cours date, creneau text, debut time without time zone, fin time without time zone, pratique boolean, ouvre_le timestamp with time zone, serveur_le timestamp with time zone, ouverte boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN IF auth.uid() IS NULL OR NOT(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM apprenants a WHERE a.id=p_apprenant_id AND a.auth_user_id=auth.uid()) OR public.est_dossier_lie_emargement(p_apprenant_id)) THEN RAISE EXCEPTION 'Accès aux feuilles refusé' USING ERRCODE='42501'; END IF;
RETURN QUERY SELECT r.date_cours,r.creneau,r.debut,r.fin,r.pratique,((r.date_cours+r.debut) AT TIME ZONE 'Europe/Paris')-interval '30 minutes',now(),
 r.date_cours<(now() AT TIME ZONE 'Europe/Paris')::date OR (r.date_cours=(now() AT TIME ZONE 'Europe/Paris')::date AND (public.emargement_fenetre_ouverte(r.date_cours,r.debut,now())
   OR (r.pratique AND r.creneau='apres_midi' AND public.emargement_pratique_matin_signe(p_apprenant_id,r.date_cours))))
 FROM public.emargement_creneaux_reels(p_apprenant_id) r WHERE r.date_cours<=(now() AT TIME ZONE 'Europe/Paris')::date+1; END $function$;