import { describe,it,expect,vi } from 'vitest';
import { remettreBilan505, type RemiseRow } from '@/lib/bilan505Remise';
const answers=Object.fromEntries(Array.from({length:49},(_,i)=>[`505-${i+1}`,['A']]));
const row:RemiseRow={id:'original',tentative:1,write_seq:100,status:'in_progress',reponses:answers,stored_reponses:answers};
const setup=()=>({apprenantId:'synthetic',answers,current:()=>answers,owner:()=>true,read:async()=>row,
 pending:()=>[],commit:vi.fn(async(r:RemiseRow)=>({...r,status:'submitted'}))});
describe('remise 505 isolée',()=>{
 it('49 concordantes même si ancien ACK bloqué',async()=>{const p=setup();p.pending=()=>[{reponses:answers,events:[],completed:false}] as never;expect((await remettreBilan505(p)).ok).toBe(true);expect(p.commit).toHaveBeenCalledTimes(1);});
 it('journal plus récent restaure sans soumettre',async()=>{const p=setup();p.read=async()=>({...row,reponses:{...answers,'505-1':['B']}});const r=await remettreBilan505(p);expect(r.restored?.['505-1']).toEqual(['B']);expect(p.commit).not.toHaveBeenCalled();});
 it('local différent du journal ET de la copie reste bloqué',async()=>{const p=setup();p.answers={...answers,'505-1':['C']};p.current=()=>p.answers;expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
 it('clic local durant lecture jamais ignoré',async()=>{const p=setup();p.read=async()=>{p.current=()=>({...answers,'505-2':['B']});return row;};expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
 it('ancien lot divergent ne passe pas silencieusement',async()=>{const p=setup();p.pending=()=>[{reponses:{'505-1':['B']},events:[],completed:false}] as never;expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
 it('journal local non acquitté divergent bloque',async()=>{const p=setup();p.pending=()=>[{reponses:answers,events:[{question_id:'505-1',valeur:['B']}],completed:false}] as never;expect((await remettreBilan505(p)).ok).toBe(false);});
 it('autre tentative en retour ne valide pas',async()=>{const p=setup();p.commit=vi.fn(async()=>({...row,tentative:2,status:'submitted'}));expect((await remettreBilan505(p)).ok).toBe(false);});
 it('réponse tardive exacte confirme sans deuxième écriture',async()=>{const p=setup();p.commit=vi.fn(async()=>{await new Promise(r=>setTimeout(r,30));return {...row,status:'submitted'};});expect((await remettreBilan505(p)).ok).toBe(true);expect(p.commit).toHaveBeenCalledTimes(1);});
 it('révision ne peut devenir une copie',async()=>{const p=setup();p.commit=vi.fn(async()=>({...row,id:'revision',status:'submitted'}));expect((await remettreBilan505(p)).ok).toBe(false);});
 it('compte changé pendant lecture bloque',async()=>{const p=setup();p.read=async()=>{p.owner=()=>false;return row;};expect((await remettreBilan505(p)).ok).toBe(false);expect(p.commit).not.toHaveBeenCalled();});
});