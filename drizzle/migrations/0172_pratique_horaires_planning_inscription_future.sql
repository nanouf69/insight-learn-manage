CREATE OR REPLACE FUNCTION public.pratique_creneaux_planifies(p_date date, p_creneau text DEFAULT 'journee') RETURNS TABLE(creneau text, debut time, fin time) LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE slot jsonb; m text; a text; sel text := lower(coalesce(p_creneau,'journee')); has_hours boolean; raw text; matched text[]; key text;
BEGIN
SELECT c.day_time_slots->p_date::text INTO slot FROM public.planning_pratique_config c WHERE c.day_time_slots ? p_date::text ORDER BY c.updated_at DESC,c.id LIMIT 1;
IF jsonb_typeof(slot)='string' THEN m := slot #>> '{}';
ELSIF jsonb_typeof(slot)='object' THEN m := nullif(slot->>'matin',''); a := nullif(slot->>'apresmidi',''); END IF;
has_hours := m IS NOT NULL OR a IS NOT NULL;
IF NOT has_hours THEN m := '9h-12h'; a := '13h-16h'; END IF;
FOREACH key IN ARRAY ARRAY['matin','apres_midi'] LOOP
IF (sel LIKE '%matin%' AND key <> 'matin') OR ((sel LIKE '%apres%' OR sel LIKE '%aprem%') AND key <> 'apres_midi') THEN CONTINUE; END IF;
raw := CASE WHEN key='matin' THEN m ELSE a END;
matched := regexp_match(raw, '^\s*(\d{1,2})(?:[h:]([0-9]{2}))?\s*[-–—]\s*(\d{1,2})(?:[h:]([0-9]{2}))?\s*$');
IF matched IS NULL THEN CONTINUE; END IF;
BEGIN debut := make_time(matched[1]::integer,coalesce(matched[2],'0')::integer,0); fin := make_time(matched[3]::integer,coalesce(matched[4],'0')::integer,0); EXCEPTION WHEN OTHERS THEN CONTINUE; END;
IF fin > debut THEN creneau := key; RETURN NEXT; END IF;
END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pratique_creneaux_planifies(date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pratique_creneaux_planifies(date,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.reservation_pratique_inscrit_session() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_session record; v_type text; h record; whole record;
BEGIN
IF NEW.apprenant_id IS NULL OR NEW.date_choisie IS NULL THEN RETURN NEW; END IF;
v_type := lower(coalesce(NEW.type_formation,'vtc')); IF v_type NOT IN ('vtc','taxi') THEN v_type := 'vtc'; END IF;
SELECT min(debut) debut,max(fin) fin INTO h FROM public.pratique_creneaux_planifies(NEW.date_choisie,NEW.creneau);
IF h.debut IS NULL THEN RAISE WARNING 'Créneau pratique non prévu : réservation conservée sans inscription automatique'; RETURN NEW; END IF;
SELECT id,heure_debut,heure_fin INTO v_session FROM public.sessions WHERE date_debut=NEW.date_choisie AND type_session LIKE 'pratique%' AND coalesce(statut,'') NOT ILIKE '%annul%' ORDER BY (type_session='pratique_'||v_type) DESC,created_at LIMIT 1;
IF v_session.id IS NULL THEN
SELECT min(debut) debut,max(fin) fin,sum(extract(epoch FROM (fin-debut))/3600) heures,array_agg(to_char(debut,'HH24:MI')||'-'||to_char(fin,'HH24:MI') ORDER BY debut) slots INTO whole FROM public.pratique_creneaux_planifies(NEW.date_choisie,'journee');
BEGIN
INSERT INTO public.sessions(nom,type_session,date_debut,date_fin,heure_debut,heure_fin,lieu,statut,places_disponibles,types_apprenant,creneaux,heures_total) VALUES ('Formation pratique '||upper(v_type)||' - '||to_char(NEW.date_choisie,'DD/MM/YYYY'),'pratique_'||v_type,NEW.date_choisie,NEW.date_choisie,to_char(whole.debut,'HH24:MI'),to_char(whole.fin,'HH24:MI'),'86 Route de Genas, 69003 Lyon','planifiee',3,ARRAY[upper(v_type)],whole.slots,whole.heures) RETURNING id,heure_debut,heure_fin INTO v_session;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'reservation_pratique_inscrit_session: session non créée (%)',SQLSTATE; RETURN NEW; END;
END IF;
BEGIN
INSERT INTO public.session_apprenants(session_id,apprenant_id,montant_total,montant_paye,mode_financement,heure_debut_personnalisee,heure_fin_personnalisee) VALUES(v_session.id,NEW.apprenant_id,0,0,'personnel',to_char(h.debut,'HH24:MI'),to_char(h.fin,'HH24:MI')) ON CONFLICT(session_id,apprenant_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'reservation_pratique_inscrit_session: inscription non faite (%)',SQLSTATE; END;
RETURN NEW;
END $$;
COMMENT ON FUNCTION public.reservation_pratique_inscrit_session() IS 'Future reservations only: explicit planning hours first; day default 09-12/13-16; personalized half-day preserved. Existing sessions and evidence never rewritten.';