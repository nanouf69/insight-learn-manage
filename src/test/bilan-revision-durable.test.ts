// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let id: string | null = null;
  const q: any = { select: () => q, eq: (k: string,v: string) => { if(k==='exercice_id') id=v; return q; }, like: () => q, order: () => q,
    range: async () => ({data:db.rows,error:null}), maybeSingle: async () => ({data:db.rows.find(r=>r.exercice_id===id)??null,error:null}) }; return q;
} } }));
import { enregistrerBilanRevision, confirmerBilanRevision, lireBilanRevision, prochaineBilanRevision, type BilanRevisionSource } from '@/lib/bilanRevisionPersistence';
import { setAnswerSaveAuthToken, setAnswerSaveOwnership, __testResetMemorySeq, getPendingAnswers } from '@/lib/answerPersistence';
import { reponsesArchiveHorsRevision } from '@/lib/bilanRevisionPrecedence';
const owner='11111111-1111-4111-8111-111111111111';
const source: BilanRevisionSource={owner,module:5,exercise:502,receipt:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',version:'v1',questions:['71','226']};
const bodies:any[]=[];
beforeEach(()=>{
 localStorage.clear(); __testResetMemorySeq(); db.rows=[]; bodies.length=0;
 setAnswerSaveAuthToken('fixture-token','22222222-2222-4222-8222-222222222222'); setAnswerSaveOwnership({apprenantId:owner});
 vi.stubGlobal('fetch',vi.fn(async (_:unknown,init:RequestInit)=>{
  const b=JSON.parse(String(init.body)); bodies.push(b);
  let row=db.rows.find(r=>r.exercice_id===b.exercice_id);
  if(!row){row={id:'row',exercice_id:b.exercice_id,reponses:{},write_seq:0,meta:{},status:'in_progress'};db.rows.push(row);}
  const skipped:string[]=[];
  if(row.status!=='submitted'){
   for(const [k,v] of Object.entries(b.reponses)){if((row.meta[k]??0)<=b.base_seq){row.reponses[k]=v;row.meta[k]=row.write_seq+1;}else skipped.push(k);}
   row.write_seq++;
   if(b.completed&&!skipped.length){row.status='submitted';row.submitted_at='2026-11-12T16:49:00Z';}
  }
  return {ok:true,json:async()=>({success:true,confirmed:true,write_seq:row.write_seq,accepted_event_ids:b.events.map((e:any)=>e.event_id),skipped_questions:skipped,stored_reponses:row.reponses}),text:async()=>''};
 }));
});
it('archive initiale intacte, les nouvelles réponses ne sont plus remplacées',()=>{
 const archives={505:{reponses:{'505-1':['A']}}};const before=JSON.stringify(archives);
 expect(reponsesArchiveHorsRevision(archives,new Set([505]))).toEqual({});
 expect(reponsesArchiveHorsRevision(archives,new Set())).toEqual({'505-1':['A']});expect(JSON.stringify(archives)).toBe(before);
});
it.each([[5,502],[11,602],[28,2801],[30,3001]])('module %i : QCM multiple + QRC, refresh et clôture unique sans note',async(module,exercise)=>{
 const s={...source,module,exercise};let r=prochaineBilanRevision(s,null);
 r={...r,answers:{'71':['A','C'],'226':'−10 euros : non'}};enregistrerBilanRevision(r);
 const saved=await confirmerBilanRevision(r);expect(saved.submitted).toBe(false);
 expect((await lireBilanRevision(s))?.answers).toEqual(r.answers);
 const final=await confirmerBilanRevision(r,true);expect(final.submitted).toBe(true);
 expect((await lireBilanRevision(s))?.submitted).toBe(true);
 expect(db.rows).toHaveLength(1);expect(bodies.every(b=>b.module_id===undefined&&b.score===undefined)).toBe(true);
 const next=prochaineBilanRevision(s,final);expect(next.id).toBe(`${r.id}__r2`);expect(next.answers).toEqual({});
 expect(db.rows[0].reponses['226']).toBe('−10 euros : non');
});
it('réponse vide locale explicite survit à la reprise, identité de version différente refusée',async()=>{
 const r={...prochaineBilanRevision(source,null),answers:{'71':['A'],'226':'texte'}};enregistrerBilanRevision(r);await confirmerBilanRevision(r);
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503,text:async()=> 'network'})));
 enregistrerBilanRevision({...r,answers:{...r.answers,'71':[]}});
 expect(getPendingAnswers(owner,r.id)?.['71']).toEqual([]);
 expect((await lireBilanRevision(source))?.answers['71']).toEqual([]);
 await expect(lireBilanRevision({...source,version:'other'})).rejects.toThrow('Identité');
});
it('ne finalise jamais une reprise incomplète',async()=>{
 const r={...prochaineBilanRevision(source,null),answers:{'71':['A']}};
 await expect(confirmerBilanRevision(r,true)).rejects.toThrow('toutes les questions');expect(bodies).toHaveLength(0);
});
it('une réponse étrangère ne peut pas être envoyée',()=>expect(()=>enregistrerBilanRevision({...prochaineBilanRevision(source,null),answers:{'alien':'x'}})).toThrow('étrangère'));