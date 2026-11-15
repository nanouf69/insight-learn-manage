-- Lot exact des 4 copies (IDs relus en SELECT le 15/11 15:46 UTC). Ne s'applique qu'APRÈS bilan_505_remise.sql.
-- N'active rien : actif reste false. Échoue en bloc si une copie n'est plus exactement in_progress/tentative 1.
DO $$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM reponses_apprenants r JOIN (VALUES
  ('d5c2b4eb-c1df-48d6-8c90-80d257b6cf07'::uuid,'a12b358b-d833-4022-a956-5e3d7d0d5200'::uuid),
  ('4d66a7f6-cc9e-4b0f-acce-006a8562bdb3'::uuid,'4d676c71-f298-44c4-b504-ad2f64334114'::uuid),
  ('cee4183a-4b52-4311-846c-a70442b3fbf1'::uuid,'f582fc9d-3003-4d8d-a619-d6373e70684c'::uuid),
  ('a527fb4e-1596-403d-9ecf-229981139804'::uuid,'10c15d2c-221f-428d-8076-fe9b1f43f7ab'::uuid)) v(rid,aid)
  ON r.id=v.rid AND r.apprenant_id=v.aid
  WHERE r.exercice_id='module_5_exo_505' AND r.tentative=1 AND r.status='in_progress' AND r.submitted_at IS NULL AND NOT r.completed;
 IF n<>4 THEN RAISE EXCEPTION 'lot_505_change: % copies conformes sur 4', n; END IF;
 INSERT INTO bilan_505_remise_copies(row_id,apprenant_id,tentative,mode,motif) VALUES
  ('d5c2b4eb-c1df-48d6-8c90-80d257b6cf07','a12b358b-d833-4022-a956-5e3d7d0d5200',1,'remise','Cabral : 49/49 concordant, snapshot 49 clés'),
  ('4d66a7f6-cc9e-4b0f-acce-006a8562bdb3','4d676c71-f298-44c4-b504-ad2f64334114',1,'remise','Abdelhak : 7 écarts certains, revue élève obligatoire'),
  ('cee4183a-4b52-4311-846c-a70442b3fbf1','f582fc9d-3003-4d8d-a619-d6373e70684c',1,'recuperation','Alpha : Q7 sans clé dans la version figée, récupération sans note'),
  ('a527fb4e-1596-403d-9ecf-229981139804','10c15d2c-221f-428d-8076-fe9b1f43f7ab',1,'recuperation','Malki : Q7 sans clé dans la version figée, récupération sans note');
END $$;
