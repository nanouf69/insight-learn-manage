import { describe,it,expect,vi } from 'vitest';
import { remettreBilan505, type RemiseRow } from '@/lib/bilan505Remise';
const answers=Object.fromEntries(Array.from({length:49},(_,i)=>[`505-${i+1}`,['A']]));
const row:RemiseRow={id:'original',tentative:1,write_seq:100,status:'in_progress',reponses:answers,stored_reponses:answers,grading_status:'verifiable',score:100,bonnes_reponses:49,total_questions:49};
const setup=()=>({apprenantId:'synthetic',answers,current:()=>answers,owner:()=>true,read:async()=>row,
 pending:()=>[],commit:vi.fn(async(r:RemiseRow)=>({...r,status:'submitted'}))});
describe('remise 505 isolée',()=>{
 it('corrigé snapshot incomplet : aucun score ni remise inventée',async()=>{const p=setup();p.read=async()=>({...row,grading_status:'corrige_snapshot_incomplet'});expect((await remettreBilan505(p)).reason).toBe('corrige_snapshot_incomplet');expect(p.commit).not.toHaveBeenCalled();});
 it('corrigé incomplet : récupération des derniers clics seulement après revue confirmée, jamais de remise',async()=>{
  const stored={...answers,'505-37':[]};const p={...setup(),recover:vi.fn(async(r:RemiseRow)=>({...r,status:'in_progress'}))};
  p.read=async()=>({...row,grading_status:'corrige_snapshot_incomplet',stored_reponses:stored,revue:[{question_id:'505-37',copie:[],dernier:['A'],certitude:'certain'}]});
  expect((await remettreBilan505(p)).reason).toBe('revue_requise');expect(p.recover).not.toHaveBeenCalled();
  const r=await remettreBilan505({...p,revueConfirmee:true});
  expect(r).toMatchObject({ok:false,reason:'corrige_snapshot_incomplet',recovered:true});expect(p.recover).toHaveBeenCalledTimes(1);expect(p.commit).not.toHaveBeenCalled();});
 it('restitution : copie affichée ancienne → derniers clics restitués avec la revue, sans écriture',async()=>{
  const stored={...answers,'505-32':['E','C']};const p=setup();p.answers=stored;p.current=()=>stored;
  p.read=async()=>({...row,stored_reponses:stored,revue:[{question_id:'505-32',copie:['E','C'],dernier:['A'],certitude:'certain'}]});
  const r=await remettreBilan505(p);expect(r.reason).toBe('dernier_clic_a_confirmer');expect(r.restored?.['505-32']).toEqual(['A']);expect(r.revue).toHaveLength(1);expect(p.commit).not.toHaveBeenCalled();});
 it('après restitution : remise refusée tant que la revue n est pas cochée, puis transmise avec confirmation',async()=>{
  const stored={...answers,'505-32':['E','C']};const p=setup();p.read=async()=>({...row,stored_reponses:stored,revue:[{question_id:'505-32',copie:['E','C'],dernier:['A'],certitude:'certain'}]});
  expect((await remettreBilan505(p)).reason).toBe('revue_requise');expect(p.commit).not.toHaveBeenCalled();
  expect((await remettreBilan505({...p,revueConfirmee:true})).ok).toBe(true);expect(p.commit).toHaveBeenCalledWith(expect.anything(),true);});
 it('revue encore affichée : un enregistrement ultérieur ne dispense pas de la confirmation',async()=>{const p=setup();
  expect((await remettreBilan505({...p,revueAffichee:true})).reason).toBe('revue_requise');expect(p.commit).not.toHaveBeenCalled();
  expect((await remettreBilan505({...p,revueAffichee:true,revueConfirmee:true})).ok).toBe(true);});
 it('clic ambigu : jamais restitué ni remis',async()=>{const p=setup();p.read=async()=>({...row,ambiguous_questions:['505-3'],revue:[{question_id:'505-3',copie:['A'],dernier:['B'],certitude:'ambigu'}]});
  const r=await remettreBilan505({...p,revueConfirmee:true});expect(r.reason).toBe('choix_ambigus');expect(p.commit).not.toHaveBeenCalled();});
 it('49 concordantes même si ancien ACK bloqué',async()=>{const p=setup();p.pending=()=>[{reponses:answers,events:[],completed:false}] as never;expect((await remettreBilan505(p)).ok).toBe(true);expect(p.commit).toHaveBeenCalledTimes(1);});
 it('journal plus récent restaure sans soumettre',async()=>{const p=setup();p.read=async()=>({...row,reponses:{...answers,'505-1':['B']}});const r=await remettreBilan505(p);expect(r.restored?.['505-1']).toEqual(['B']);expect(p.commit).not.toHaveBeenCalled();});
 it('local différent du journal ET de la copie reste bloqué',async()=>{const p=setup();p.answers={...answers,'505-1':['C']};p.current=()=>p.answers;expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
 it('clic local durant lecture jamais ignoré',async()=>{const p=setup();p.read=async()=>{p.current=()=>({...answers,'505-2':['B']});return row;};expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
 it('ancien lot divergent ne passe pas silencieusement',async()=>{const p=setup();p.pending=()=>[{reponses:{'505-1':['B']},events:[],completed:false}] as never;expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
 it('journal local non acquitté divergent bloque',async()=>{const p=setup();p.pending=()=>[{reponses:answers,events:[{question_id:'505-1',valeur:['B']}],completed:false}] as never;expect((await remettreBilan505(p)).ok).toBe(false);});
 it('autre tentative en retour ne valide pas',async()=>{const p=setup();p.commit=vi.fn(async()=>({...row,tentative:2,status:'submitted'}));expect((await remettreBilan505(p)).ok).toBe(false);});
 it('réponse tardive exacte confirme sans deuxième écriture',async()=>{const p=setup();p.commit=vi.fn(async()=>{await new Promise(r=>setTimeout(r,30));return {...row,status:'submitted'};});expect((await remettreBilan505(p)).ok).toBe(true);expect(p.commit).toHaveBeenCalledTimes(1);});
 it('révision ne peut devenir une copie',async()=>{const p=setup();p.commit=vi.fn(async()=>({...row,id:'revision',status:'submitted'}));expect((await remettreBilan505(p)).ok).toBe(false);});
 it('compte changé pendant lecture bloque',async()=>{const p=setup();let same=true;p.owner=()=>same;p.read=async()=>{same=false;return row;};expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
});