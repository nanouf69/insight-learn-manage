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
-- Accepte « 9h-12h », « 9h30-12h », « 9-12 », « 13:00-16:00 » (le « h » final était refusé auparavant).
matched := regexp_match(raw, '^\s*(\d{1,2})\s*(?:[hH:]\s*([0-9]{2})?)?\s*[-–—]\s*(\d{1,2})\s*(?:[hH:]\s*([0-9]{2})?)?\s*$');
IF matched IS NULL THEN CONTINUE; END IF;
BEGIN debut := make_time(matched[1]::integer,coalesce(matched[2],'0')::integer,0); fin := make_time(matched[3]::integer,coalesce(matched[4],'0')::integer,0); EXCEPTION WHEN OTHERS THEN CONTINUE; END;
IF fin > debut THEN creneau := key; RETURN NEXT; END IF;
END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pratique_creneaux_planifies(date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pratique_creneaux_planifies(date,text) TO authenticated,service_role;