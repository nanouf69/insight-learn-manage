CREATE OR REPLACE FUNCTION public.garde_quiz_equipements_taxi_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE k text; nb int[] := ARRAY[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]; n int;
BEGIN
  IF NEW.exercice_id <> 'quiz_taxi_locale_equipements_v1' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Quiz Équipements TAXI déjà terminé : preuve conservée' USING ERRCODE='42501';
  END IF;
  IF NEW.score IS NOT NULL THEN RAISE EXCEPTION 'Quiz Équipements TAXI non noté' USING ERRCODE='23514'; END IF;
  IF NEW.reponses->>'version' IS DISTINCT FROM '2026-10-27-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object'
    OR coalesce(NEW.reponses->>'revision','')='' THEN
    RAISE EXCEPTION 'Version ou identité de saisie manquante' USING ERRCODE='23514';
  END IF;
  IF NEW.completed IS TRUE THEN
    FOR n IN 1..15 LOOP
      k := 'q'||lpad(n::text,2,'0');
      IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string'
        OR NEW.reponses->'valeurs'->>k !~ '^[0-9]$'
        OR (NEW.reponses->'valeurs'->>k)::int >= nb[n] THEN
        RAISE EXCEPTION 'Quiz Équipements TAXI incomplet : %', k USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_garde_quiz_equipements_taxi_v1
BEFORE INSERT OR UPDATE ON public.reponses_apprenants
FOR EACH ROW EXECUTE FUNCTION public.garde_quiz_equipements_taxi_v1();

CREATE OR REPLACE FUNCTION public.quiz_equipements_taxi_protection_prete()
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_garde_quiz_equipements_taxi_v1' AND tgenabled='O');
$$;
GRANT EXECUTE ON FUNCTION public.quiz_equipements_taxi_protection_prete() TO authenticated, anon;