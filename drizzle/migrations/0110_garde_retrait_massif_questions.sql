CREATE OR REPLACE FUNCTION public.garde_retrait_massif_questions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_retirees int;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.module_data IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_retirees FROM (
    SELECT (e->>'id') || ':' || (q->>'id') AS k
    FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(COALESCE(e->'questions','[]'::jsonb)) q
    EXCEPT
    SELECT (e->>'id') || ':' || (q->>'id')
    FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(COALESCE(e->'questions','[]'::jsonb)) q
  ) s;
  IF v_retirees > 2 THEN
    RAISE EXCEPTION 'Enregistrement refusé : il retirerait % questions du module % d''un coup (maximum 2).', v_retirees, NEW.module_id
      USING ERRCODE = 'P0520';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_aaa_garde_retrait_massif
BEFORE UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW EXECUTE FUNCTION public.garde_retrait_massif_questions();