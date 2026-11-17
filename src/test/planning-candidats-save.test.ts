import { describe,it,expect,vi } from 'vitest';
import { enregistrerListesPlanning } from '../lib/planningCandidatsSave';
describe('Ajout candidats planning',()=>{
 it('met à jour la liste existante sans dates et ne tente aucun insert',async()=>{
  const fields={extra_candidats:['existing','cma:new']};
  const insert=vi.fn(); const update=vi.fn(async()=>({data:{extra_candidats:fields.extra_candidats},error:null}));
  await enregistrerListesPlanning({exists:true,fields,insert,update});
  expect(update).toHaveBeenCalledWith(fields);expect(insert).not.toHaveBeenCalled();
 });
 it('crée une période avec ses dates complètes',async()=>{
  const fields={extra_candidats:['new'],planning_start_date:'2026-11-18',planning_end_date:'2026-12-15'};
  const insert=vi.fn(async()=>({data:{extra_candidats:['new']},error:null}));const update=vi.fn();
  await enregistrerListesPlanning({exists:false,fields,insert,update});expect(insert).toHaveBeenCalledWith(fields);expect(update).not.toHaveBeenCalled();
 });
 it('refuse un succès sans ligne confirmée',async()=>{
  await expect(enregistrerListesPlanning({exists:true,fields:{extra_candidats:['new']},insert:vi.fn(),update:async()=>({data:null,error:null})})).rejects.toThrow('non retrouvé');
 });
 it('refuse une liste différente ou une erreur serveur',async()=>{
  await expect(enregistrerListesPlanning({exists:true,fields:{extra_candidats:['new']},insert:vi.fn(),update:async()=>({data:{extra_candidats:[]},error:null})})).rejects.toThrow('non confirmée');
  await expect(enregistrererreur()).rejects.toThrow('refus');
 });
});
function enregistrererreur(){return enregistrerListesPlanning({exists:true,fields:{extra_candidats:[]},insert:vi.fn(),update:async()=>({data:null,error:{message:'refus'}})});}