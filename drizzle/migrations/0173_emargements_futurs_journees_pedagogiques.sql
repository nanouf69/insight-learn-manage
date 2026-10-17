CREATE OR REPLACE FUNCTION public.generer_emargements_session(p_session_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; a record; b record; d date; cren text; start_h time; end_h time; nb integer := 0;
BEGIN
SELECT * INTO s FROM public.sessions WHERE id=p_session_id;
IF NOT FOUND OR lower(coalesce(s.type_session,'')) <> 'theorique' OR coalesce(s.statut,'') ILIKE '%annul%' THEN RETURN 0; END IF;
FOR a IN SELECT sa.*,ap.auth_user_id,lower(split_part(coalesce(ap.type_apprenant,''),'-',1)) filiere FROM public.session_apprenants sa JOIN public.apprenants ap ON ap.id=sa.apprenant_id WHERE sa.session_id=p_session_id AND ap.auth_user_id IS NOT NULL AND ap.deleted_at IS NULL AND NOT coalesce(ap.abandonnee,false) AND NOT coalesce(sa.liste_attente,false) AND NOT coalesce(sa.emargements_exclus,false) LOOP
start_h := coalesce(nullif(a.heure_debut_personnalisee,'')::time,nullif(s.heure_debut,'')::time); end_h := coalesce(nullif(a.heure_fin_personnalisee,'')::time,nullif(s.heure_fin,'')::time);
IF start_h IS NULL OR end_h IS NULL THEN CONTINUE; END IF;
FOR b IN SELECT ab.* FROM public.agenda_blocs ab WHERE ab.semaine_debut::date+ab.jour >= greatest(s.date_debut,coalesce(a.date_debut,s.date_debut),(now() AT TIME ZONE 'Europe/Paris')::date) AND ab.semaine_debut::date+ab.jour <= least(coalesce(s.date_fin,s.date_debut),coalesce(a.date_fin_personnalisee,a.date_fin,s.date_fin,s.date_debut)) AND (CASE WHEN cardinality(coalesce(ab.publics_cibles,ARRAY[]::text[]))>0 THEN upper(a.filiere)=ANY(ab.publics_cibles) ELSE ab.formation ~* ('\m'||a.filiere||'\M') END) LOOP
d := b.semaine_debut::date+b.jour;
FOREACH cren IN ARRAY ARRAY['matin','apres_midi','soir_1','soir_2'] LOOP
IF NOT (CASE cren WHEN 'matin' THEN start_h<'12:00' AND b.heure_debut::time<'12:00' WHEN 'apres_midi' THEN start_h<'17:00' AND end_h>'13:00' AND b.heure_debut::time<'17:00' AND b.heure_fin::time>'13:00' WHEN 'soir_1' THEN start_h>='17:00' AND start_h<'18:30' AND b.heure_debut::time>='17:00' AND b.heure_debut::time<'18:30' ELSE start_h>='17:00' AND end_h>'18:30' AND b.heure_debut::time>='17:00' AND b.heure_fin::time>'18:30' END) THEN CONTINUE; END IF;
INSERT INTO public.emargements_fc(apprenant_id,user_id,date_emargement,demi_journee) VALUES(a.apprenant_id,a.auth_user_id,d,cren) ON CONFLICT(apprenant_id,date_emargement,demi_journee) DO NOTHING; IF FOUND THEN nb:=nb+1; END IF;
END LOOP; END LOOP; END LOOP; RETURN nb;
END $$;
COMMENT ON FUNCTION public.generer_emargements_session(uuid) IS 'Future dated teaching blocks only, assigned dates/custom hours, excluding waitlisted/excluded learners; no retrospective bulk generation and no signature mutation.';
CREATE OR REPLACE FUNCTION public.generer_emargements_planning_pratique(p_apprenant_id uuid DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; p record; nb integer :=0;
BEGIN
FOR r IN SELECT rp.*,ap.auth_user_id FROM public.reservations_pratique rp JOIN public.apprenants ap ON ap.id=rp.apprenant_id WHERE (p_apprenant_id IS NULL OR rp.apprenant_id=p_apprenant_id) AND rp.date_choisie >= (now() AT TIME ZONE 'Europe/Paris')::date AND ap.auth_user_id IS NOT NULL AND ap.deleted_at IS NULL AND NOT coalesce(ap.abandonnee,false) AND EXISTS(SELECT 1 FROM public.planning_pratique_config c WHERE c.day_time_slots ? rp.date_choisie::text) AND NOT EXISTS(SELECT 1 FROM public.session_apprenants sa JOIN public.sessions s ON s.id=sa.session_id WHERE sa.apprenant_id=rp.apprenant_id AND s.date_debut=rp.date_choisie AND s.type_session LIKE 'pratique%' AND (coalesce(sa.emargements_exclus,false) OR coalesce(sa.liste_attente,false))) LOOP
FOR p IN SELECT * FROM public.pratique_creneaux_planifies(r.date_choisie,r.creneau) LOOP
INSERT INTO public.emargements_fc(apprenant_id,user_id,date_emargement,demi_journee) VALUES(r.apprenant_id,r.auth_user_id,r.date_choisie,p.creneau) ON CONFLICT(apprenant_id,date_emargement,demi_journee) DO NOTHING; IF FOUND THEN nb:=nb+1; END IF;
END LOOP; END LOOP; RETURN nb;
END $$;