CREATE OR REPLACE FUNCTION public.bilan_examen_refuse_nouvelle_qrc()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  IF NEW.module_id NOT IN (5, 11) THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count
  FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) e,
       jsonb_array_elements(COALESCE(e->'questions','[]'::jsonb)) q
  WHERE upper(COALESCE(q->>'type','')) = 'QRC'
    AND (TG_OP = 'INSERT' OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices','[]'::jsonb)) oe,
           jsonb_array_elements(COALESCE(oe->'questions','[]'::jsonb)) oq
      WHERE oe->>'id' = e->>'id' AND oq->>'id' = q->>'id'
        AND upper(COALESCE(oq->>'type','')) = 'QRC'));
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Bilan Examen = QCM uniquement : % nouvelle(s) QRC refusée(s). Aucune modification enregistrée.', v_count
      USING ERRCODE = 'P0490';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bilan_examen_refuse_nouvelle_qrc ON public.module_editor_state;
CREATE TRIGGER trg_bilan_examen_refuse_nouvelle_qrc
BEFORE INSERT OR UPDATE OF module_data ON public.module_editor_state
FOR EACH ROW EXECUTE FUNCTION public.bilan_examen_refuse_nouvelle_qrc();