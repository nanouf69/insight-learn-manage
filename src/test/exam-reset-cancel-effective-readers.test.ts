import {readFileSync} from 'node:fs';
import {vi,it,expect} from 'vitest';
import {effectiveExamReadClient} from '@/lib/examResetEffectiveReader';
const state=vi.hoisted(()=>({tables:{} as Record<string,any[]>,effective:false}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 const mapping:Record<string,string>={core_exam_resets:'core_exam_resets_effective',core_tentatives_neutralisees:'core_exam_neutralisations_effective',exam_retake_authorizations:'exam_retake_authorizations_effective'};
 let rows=[...(state.tables[state.effective?(mapping[table]??table):table]??[])];
 const q:any={select:()=>q,order:()=>q,in:(k:string,ids:string[])=>{rows=rows.filter(r=>ids.includes(r[k]));return q;},eq:(k:string,v:any)=>{rows=rows.filter(r=>r[k]===v);return q;},range:(a:number,b:number)=>Promise.resolve({data:rows.slice(a,b+1),error:null}),then:(fn:any)=>Promise.resolve({data:rows,error:null}).then(fn)};return q;
}}}));
import {fetchCoreMatiereStates,coreStateScore} from '@/lib/coreExamPublication';
import {listerSessions} from '@/features/correction-qrc-v2/noyauReel';
import {latestExamResetCutoffs} from '@/lib/examResetCutoff';
it('real SQL fixture: same seven official notes appear in shared learner/CRM and QRC readers only with effective projections',async()=>{
 state.tables=JSON.parse(readFileSync('/tmp/exam-reset-cancel-reader-fixture.json','utf8'));state.effective=false;
 expect(await fetchCoreMatiereStates('11111111-1111-1111-1111-111111111111')).toHaveLength(0);
 expect(await listerSessions('test')).toHaveLength(0);
 state.effective=true;
 const states=await fetchCoreMatiereStates('11111111-1111-1111-1111-111111111111');
 expect(states).toHaveLength(7);expect(states?.map(s=>coreStateScore(s)?.noteSur20)).toEqual([17,17,17,17,17,17,17]);
 const sessions=await listerSessions('test');expect(sessions.flatMap(s=>s.attemptIds)).toHaveLength(7);
 expect(latestExamResetCutoffs(state.tables.core_exam_resets_effective)).toEqual({});
 expect(state.tables.exam_retake_authorizations_effective).toHaveLength(0);
});
it('prepared adapter maps reads but rejects writes',()=>{
 const from=vi.fn(()=>({insert:vi.fn(),select:vi.fn(()=>42)}));const c=effectiveExamReadClient({from});
 expect(c.from('core_exam_resets').select()).toBe(42);expect(from).toHaveBeenCalledWith('core_exam_resets_effective');
 expect(()=>c.from('core_exam_resets').insert()).toThrow('Lecture seule');
});