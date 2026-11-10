-- Garde serveur : une note QRC V2 ne peut être ni négative ni supérieure à son barème figé
-- (barème restauré prouvé s'il existe, sinon points du snapshot de la tentative).
-- Ne s'applique qu'aux UPDATE qui changent la note ; aucune ligne existante n'est réécrite.
-- Barème inconnu ou ambigu : seule la borne 0 s'applique (aucun blocage inventé).
CREATE OR REPLACE FUNCTION public.qrc_v2_garde_bareme()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bareme numeric;
  v_nb int;
BEGIN
  IF NEW.note IS NULL OR NEW.note IS NOT DISTINCT FROM OLD.note THEN
    RETURN NEW;
  END IF;
  IF NEW.note < 0 THEN
    RAISE EXCEPTION 'QRC_NOTE_HORS_BAREME: note negative refusee (%).', NEW.qrc_instance_id USING ERRCODE = 'P0478';
  END IF;
  SELECT r.bareme INTO v_bareme FROM public.qrc_bareme_restaure r WHERE r.qrc_instance_id = NEW.qrc_instance_id;
  IF v_bareme IS NULL THEN
    SELECT count(DISTINCT q->>'points'), min((q->>'points')::numeric)
      INTO v_nb, v_bareme
      FROM public.exam_attempts_v2 a, jsonb_array_elements(a.snapshot->'questions') q
     WHERE a.attempt_id = NEW.attempt_id
       AND q->>'id' = NEW.question_id
       AND q->>'points' ~ '^[0-9]+(\.[0-9]+)?$';
    IF v_nb IS DISTINCT FROM 1 THEN v_bareme := NULL; END IF;
  END IF;
  IF v_bareme IS NOT NULL AND v_bareme > 0 AND NEW.note > v_bareme THEN
    RAISE EXCEPTION 'QRC_NOTE_HORS_BAREME: note % superieure au bareme % (%).', NEW.note, v_bareme, NEW.qrc_instance_id USING ERRCODE = 'P0478';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.qrc_v2_garde_bareme() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_qrc_v2_bareme ON public.qrc_instances_v2;
CREATE TRIGGER trg_qrc_v2_bareme
  BEFORE UPDATE OF note ON public.qrc_instances_v2
  FOR EACH ROW EXECUTE FUNCTION public.qrc_v2_garde_bareme();
