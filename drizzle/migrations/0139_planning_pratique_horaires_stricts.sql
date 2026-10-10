CREATE OR REPLACE FUNCTION public.planning_pratique_horaires_stricts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE k text; v jsonb; old_v jsonb;
BEGIN
  IF NEW.day_time_slots IS NULL OR jsonb_typeof(NEW.day_time_slots) <> 'object' THEN RETURN NEW; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(NEW.day_time_slots) LOOP
    old_v := CASE WHEN TG_OP = 'UPDATE' THEN OLD.day_time_slots -> k ELSE NULL END;
    -- Seuls les jours nouveaux ou modifiés sont normalisés ; l'historique reste intact.
    IF old_v IS NOT DISTINCT FROM v OR jsonb_typeof(v) <> 'object' THEN CONTINUE; END IF;
    IF coalesce(v->>'apresmidi','') <> '' AND v->>'apresmidi' <> '13h-16h' THEN
      v := v || jsonb_build_object('apresmidi','13h-16h','apresmidi_saisi_origine', v->>'apresmidi','horaire_normalise_at', now());
    END IF;
    IF coalesce(v->>'matin','') <> '' AND v->>'matin' <> '9h-12h' THEN
      v := v || jsonb_build_object('matin','9h-12h','matin_saisi_origine', v->>'matin','horaire_normalise_at', now());
    END IF;
    IF v->>'horaireMode' = '9-12_13-17' THEN v := v || jsonb_build_object('horaireMode','9-12_13-16'); END IF;
    NEW.day_time_slots := jsonb_set(NEW.day_time_slots, ARRAY[k], v);
  END LOOP;
  RETURN NEW;
END $$;
COMMENT ON FUNCTION public.planning_pratique_horaires_stricts() IS 'Pratique VTC/TAXI : horaires stricts 9h-12h / 13h-16h sur les jours nouveaux ou modifiés ; saisie d''origine tracée, historique non réécrit.';
DROP TRIGGER IF EXISTS trg_a_planning_pratique_horaires_stricts ON public.planning_pratique_config;
CREATE TRIGGER trg_a_planning_pratique_horaires_stricts BEFORE INSERT OR UPDATE OF day_time_slots ON public.planning_pratique_config
FOR EACH ROW EXECUTE FUNCTION public.planning_pratique_horaires_stricts();