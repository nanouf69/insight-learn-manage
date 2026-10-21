-- Local PostgreSQL fixture only. Never run against project/production.
-- Runner creates public.reponses_apprenants synthetic fixture before staging SQL.
DO $$
DECLARE payload jsonb; id text; n int; c text; rejected boolean;
BEGIN
  INSERT INTO public.reponses_apprenants(exercice_id,reponses,completed,score) VALUES ('old_unchanged','{"legacy":true}',true,88);
  FOREACH id IN ARRAY ARRAY['jeu_taxi_2026_feries_v1','jeu_taxi_2026_tarifs_v1','jeu_taxi_2026_rtst_v1'] LOOP
    payload='{"version":"2026-v1","revision":"test-1","valeurs":{}}';
    INSERT INTO public.reponses_apprenants(exercice_id,reponses,completed,score) VALUES(id,payload,false,null);
    rejected=false;
    BEGIN UPDATE public.reponses_apprenants SET completed=true WHERE exercice_id=id;
    EXCEPTION WHEN check_violation THEN rejected=true; END;
    IF NOT rejected THEN RAISE EXCEPTION 'FAIL incomplete accepted %',id; END IF;
    IF id='jeu_taxi_2026_feries_v1' THEN
      FOR n IN 1..11 LOOP payload=jsonb_set(payload,ARRAY['valeurs','f'||lpad(n::text,2,'0')],'"2026-01-01"'); END LOOP;
    ELSIF id='jeu_taxi_2026_tarifs_v1' THEN
      FOR n IN 1..30 LOOP payload=jsonb_set(payload,ARRAY['valeurs','t'||lpad(n::text,2,'0')],'"0"'); END LOOP;
    ELSE
      FOR n IN 1..13 LOOP FOREACH c IN ARRAY ARRAY['r','tarif','s','attente'] LOOP
        payload=jsonb_set(payload,ARRAY['valeurs','s'||lpad(n::text,2,'0')||'_'||c],'"hypothese"');
      END LOOP; END LOOP;
    END IF;
    UPDATE public.reponses_apprenants SET reponses=payload,completed=true WHERE exercice_id=id;
    rejected=false;
    BEGIN UPDATE public.reponses_apprenants SET reponses=jsonb_set(payload,'{revision}','"test-2"') WHERE exercice_id=id;
    EXCEPTION WHEN insufficient_privilege THEN rejected=true; END;
    IF NOT rejected THEN RAISE EXCEPTION 'FAIL terminal overwritten %',id; END IF;
    RAISE NOTICE 'PASS incomplete refused, full proof accepted, terminal immutable: %',id;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM public.reponses_apprenants WHERE exercice_id='old_unchanged' AND score=88 AND reponses='{"legacy":true}') THEN RAISE EXCEPTION 'FAIL legacy changed'; END IF;
  rejected=false;
  BEGIN INSERT INTO public.reponses_apprenants(exercice_id,reponses,score) VALUES('jeu_taxi_2026_feries_v1','{"version":"2026-v1","revision":"r","valeurs":{}}',1);
  EXCEPTION WHEN check_violation THEN rejected=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL score accepted'; END IF;
  RAISE NOTICE 'PASS legacy unchanged and scores refused';
END $$;