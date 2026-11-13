import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ active: true, failRead: false, foreign: false, calls: 0 }));
vi.mock('@/lib/presenceRevocations', async importOriginal => ({ ...await importOriginal<any>(), get PRESENCE_REVOCATIONS_ACTIVE() { return state.active; } }));
const receipt = { id:'d',validation_id:'v4',apprenant_id:'a',version:1,action:'annuler',created_by:'admin',created_at:'2026-11-13T16:00:00Z',motif:'audit' };
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth:{getUser:async()=>({data:{user:{id:'admin'}},error:null})},
  rpc:async()=>{state.calls++;return {data:{...receipt,created_by:state.foreign?'other':'admin'},error:null};},
  from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,range:async()=>state.failRead?{error:new Error('read failed')}:{data:table==='presentiel_validation_decisions'?[receipt]:[{id:'v4',heures:4},{id:'v15',heures:1.5}],error:null}};return q;},
} }));
import { envoyerDecisionPresence } from '@/lib/presenceDecisionTransport';
import { lirePresencesAdministratives } from '@/lib/heuresValideesAdmin';
const c={operationId:'op',apprenantId:'a',validationId:'v4',version:0,action:'annuler' as const,motif:''};
describe('Transport présence et lecture effective',()=>{
 beforeEach(()=>{state.active=true;state.failRead=false;state.foreign=false;state.calls=0;});
 it('annulation relue retire seulement 4h, conserve 1h30 et historique',async()=>{
  expect((await envoyerDecisionPresence(c)).validation_id).toBe('v4');
  expect((await lirePresencesAdministratives('a')).map(r=>r.heures)).toEqual([1.5]);
  expect(await lirePresencesAdministratives('a',true)).toHaveLength(2);
 });
 it('lecture refusée ne produit aucun succès',async()=>{state.failRead=true;await expect(envoyerDecisionPresence(c)).rejects.toThrow();});
 it('auteur différent refusé',async()=>{state.foreign=true;await expect(envoyerDecisionPresence(c)).rejects.toThrow('Auteur');});
 it('installation inactive interdit tout appel réel',async()=>{state.active=false;await expect(envoyerDecisionPresence(c)).rejects.toThrow();expect(state.calls).toBe(0);});
});