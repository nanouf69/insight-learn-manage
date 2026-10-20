// @vitest-environment node
import { it, expect } from 'vitest';
import { reprisesProuvees, type RepriseAffichage } from '@/features/correction-qrc-v2/repriseAffichage';
const proof: RepriseAffichage = {
  qrc_instance_id:'synthetic-q3',statut:'appliquee',created_at:'2026-10-20T08:49:00Z',termine_at:'2026-10-20T08:51:09Z',
  base:{bareme:2},resultat:{qrc_instance_id:'synthetic-q3',etat:'corrigee',note:0},message:null,
};
it('a final server proof, including zero points, replaces an obsolete trace',()=>{
  expect(reprisesProuvees([proof])).toEqual([proof]);
});
it('reservation, error or ignored retry never pretends correction is finished',()=>{
  for (const statut of ['en_cours','erreur','ignoree']) expect(reprisesProuvees([{...proof,statut}])).toEqual([]);
});
it('wrong identity, missing publication or missing score never supersedes history',()=>{
  expect(reprisesProuvees([{...proof,resultat:{...proof.resultat,qrc_instance_id:'another'}}])).toEqual([]);
  expect(reprisesProuvees([{...proof,resultat:null}])).toEqual([]);
  expect(reprisesProuvees([{...proof,termine_at:null}])).toEqual([]);
  expect(reprisesProuvees([{...proof,resultat:{qrc_instance_id:'synthetic-q3',etat:'corrigee'}}])).toEqual([]);
});