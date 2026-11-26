-- CANDIDAT NON EXECUTE. APRÈS installation de docs/livraison-505/bilan_505_remise.sql.
-- Autorisations append-only seulement. Ne récupère aucune réponse, ne remet aucune copie,
-- ne calcule aucune note et ne modifie pas l'interrupteur d'activation.
DO $$
DECLARE r record; copie public.reponses_apprenants%ROWTYPE;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('4d66a7f6-cc9e-4b0f-acce-006a8562bdb3'::uuid,'4d676c71-f298-44c4-b504-ad2f64334114'::uuid,70,'98fe17b69f3d33067b0bb5bef48036c6','remise','Revue volontaire des sept écarts; snapshot complet'),
 ('cee4183a-4b52-4311-846c-a70442b3fbf1'::uuid,'f582fc9d-3003-4d8d-a619-d6373e70684c'::uuid,73,'b4afd9cb872443ae4eb5df6f0c2209a0','recuperation','Trois écarts; Q7 sans corrigé figé: aucune note/remise'),
 ('a527fb4e-1596-403d-9ecf-229981139804'::uuid,'10c15d2c-221f-428d-8076-fe9b1f43f7ab'::uuid,59,'ff55799475cfeb47b1f7b363487aef89','recuperation','Un écart; Q7 sans corrigé figé: aucune note/remise'),
 ('d5c2b4eb-c1df-48d6-8c90-80d257b6cf07'::uuid,'a12b358b-d833-4022-a956-5e3d7d0d5200'::uuid,100,'204ef09e63b62828109138ff0c536798','remise','Concordant; prochain clic volontaire seulement')
 ) x(rid,aid,seq,hash,mode,motif) LOOP
  SELECT * INTO copie FROM public.reponses_apprenants WHERE id=r.rid FOR UPDATE;
  IF NOT FOUND OR copie.apprenant_id IS DISTINCT FROM r.aid
     OR copie.exercice_id <> 'module_5_exo_505' OR copie.tentative <> 1
     OR copie.status <> 'in_progress' OR copie.submitted_at IS NOT NULL
     OR copie.completed OR copie.score IS NOT NULL
     OR copie.write_seq <> r.seq OR md5(copie.reponses::text) <> r.hash THEN
    RAISE EXCEPTION 'LOT_505_CHANGE: relecture requise';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bilan_505_remise_copies c WHERE c.row_id=r.rid
     AND (c.apprenant_id IS DISTINCT FROM r.aid OR c.tentative<>1 OR c.mode<>r.mode)) THEN
    RAISE EXCEPTION 'LOT_505_AUTORISATION_DIVERGENTE';
  END IF;
  INSERT INTO public.bilan_505_remise_copies(row_id,apprenant_id,tentative,mode,motif)
  SELECT r.rid,r.aid,1,r.mode,r.motif
  WHERE NOT EXISTS(SELECT 1 FROM public.bilan_505_remise_copies c WHERE c.row_id=r.rid);
 END LOOP;
END $$;