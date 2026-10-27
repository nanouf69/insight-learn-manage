CREATE OR REPLACE FUNCTION public.qrc_ia_rattrapage_historique_garde() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d jsonb;
BEGIN
  SELECT details INTO d FROM public.apprenant_quiz_results WHERE id = NEW.result_id;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(d->'snapshot'->'questions') q
             WHERE upper(q->>'type')='QRC' AND coalesce(d->'correctionsIA'->(q->>'id')->>'validatedByAdmin','false')='true') THEN
    RAISE EXCEPTION 'Copie déjà corrigée par un formateur : rattrapage IA refusé' USING ERRCODE='P0540';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_qrc_ia_rattrapage_historique_garde ON public.qrc_ia_rattrapages_historiques;
CREATE TRIGGER trg_qrc_ia_rattrapage_historique_garde BEFORE INSERT ON public.qrc_ia_rattrapages_historiques
  FOR EACH ROW EXECUTE FUNCTION public.qrc_ia_rattrapage_historique_garde();