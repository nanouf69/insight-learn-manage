CREATE OR REPLACE FUNCTION public.enforce_reservations_pratique_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exam_date text;
  v_default_max integer := 3;
  v_day_max integer := 3;
  v_count integer := 0;
  v_cfg_max integer;
  v_cfg_map jsonb := '{}'::jsonb;
BEGIN
  IF NEW.date_choisie IS NULL OR NEW.type_formation IS NULL OR NEW.apprenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.date_examen_theorique
    INTO v_exam_date
  FROM public.apprenants a
  WHERE a.id = NEW.apprenant_id;

  SELECT c.max_per_day, COALESCE(c.max_per_day_map::jsonb, '{}'::jsonb)
    INTO v_cfg_max, v_cfg_map
  FROM public.planning_pratique_config c
  WHERE (
      v_exam_date IS NOT NULL
      AND lower(public.unaccent(v_exam_date)) LIKE '%' || lower(public.unaccent(c.exam_date)) || '%'
    )
    OR NEW.date_choisie BETWEEN c.planning_start_date AND c.planning_end_date
  ORDER BY
    CASE WHEN v_exam_date IS NOT NULL AND lower(public.unaccent(v_exam_date)) LIKE '%' || lower(public.unaccent(c.exam_date)) || '%' THEN 0 ELSE 1 END,
    c.updated_at DESC
  LIMIT 1;

  IF v_cfg_max IS NOT NULL THEN
    v_default_max := GREATEST(1, v_cfg_max);
  END IF;

  v_day_max := COALESCE(
    NULLIF((COALESCE(v_cfg_map, '{}'::jsonb) ->> NEW.date_choisie::text), '')::integer,
    v_default_max,
    3
  );
  v_day_max := GREATEST(1, v_day_max);

  SELECT count(*)
    INTO v_count
  FROM public.reservations_pratique r
  WHERE r.date_choisie = NEW.date_choisie
    AND lower(r.type_formation) = lower(NEW.type_formation)
    AND r.apprenant_id <> NEW.apprenant_id;

  IF v_count >= v_day_max THEN
    RAISE EXCEPTION 'Journée complète: % candidat(s) maximum pour % le %', v_day_max, upper(NEW.type_formation), NEW.date_choisie
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;