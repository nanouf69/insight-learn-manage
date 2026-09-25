CREATE OR REPLACE FUNCTION public.bilan_garde_reponses_verrouillees()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE m text[]; r record;
BEGIN
  m := regexp_match(NEW.exercice_id, '^module_(\d+)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  -- Identifiants techniques longs (> integer) : ne peuvent correspondre à aucun statut Bilan.
  IF length(m[1]) > 9 OR length(m[2]) > 9 THEN RETURN NEW; END IF;
  FOR r IN SELECT cle, reponse FROM bilan_reponse_statuts_effectifs
            WHERE apprenant_id = NEW.apprenant_id AND module_id = m[1]::int AND exercice_id = m[2]::int
              AND tentative = COALESCE(NEW.tentative, 1) AND statut <> 'CERTAINE' LOOP
    IF TG_OP = 'UPDATE' AND OLD.reponses ? r.cle THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], OLD.reponses->r.cle);
    ELSIF r.reponse IS NOT NULL THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], r.reponse);
    END IF;
  END LOOP;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.bilan_garde_passage_rouge()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE m text[];
BEGIN
  m := regexp_match(OLD.exercice_id, '^module_(5|11)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  IF length(m[2]) > 9 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.tentative, OLD.tentative) <> COALESCE(OLD.tentative, 1) THEN
    IF current_setting('app.bilan_rouge_ouverture', true) = '1' THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bilan_passage_categories c
                 WHERE c.apprenant_id = OLD.apprenant_id AND c.module_id = m[1]::int AND c.exercice_id = m[2]::int
                   AND c.tentative = COALESCE(OLD.tentative, 1) AND c.categorie = 'ROUGE') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF current_setting('app.bilan_rouge_ouverture', true) = '1' THEN RETURN NEW; END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed IS DISTINCT FROM OLD.completed OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.tentative IS DISTINCT FROM OLD.tentative THEN
    RAISE EXCEPTION 'Ancien passage conservé : nouvelle tentative à autoriser par l''Admin' USING ERRCODE = 'P0499';
  END IF;
  RETURN NEW;
END $function$;