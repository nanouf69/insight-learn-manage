// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ rows: [] as any[], failAt: -1, ranges: [] as number[], filters: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let rows = [...state.rows];
  const q: any = { select: () => q, eq: (k:string,v:any) => { rows=rows.filter(r=>r[k]===v);return q; },
    in: (k:string,v:any[]) => {state.filters.push(v);rows=rows.filter(r=>v.includes(r[k]));return q;},
    order: () => {rows.sort((a,b)=>a.id.localeCompare(b.id));return q;},
    range: async (start:number,end:number) => { state.ranges.push(start);return start===state.failAt ? {data:null,error:{code:'network'}} : {data:rows.slice(start,end+1),error:null};} };
  return q;
} } }));
import { lireResultatsQuizEleve } from '@/lib/learnerQuizResultsRead';
import { lignesExamenAffichees } from '@/lib/ebLignesAffichees';
describe('Complete identical input for student and CRM', () => {
  it('2501 rows beyond 1000, both EB types, stored attempt preserved', async () => {
    state.rows=Array.from({length:2501},(_,i)=>({id:String(i).padStart(5,'0'),apprenant_id:'u',quiz_id:'EB1',quiz_type:i%2?'examen_blanc_taxi':'examen_blanc',tentative:2,completed_at:'2026-11-01',created_at:'2026-11-01'}));
    state.failAt=-1;state.ranges=[];
    const r=await lireResultatsQuizEleve('u',undefined,'examen_blanc');
    expect(r.data).toHaveLength(2501);expect(new Set(r.data?.map(x=>x.id)).size).toBe(2501);
    expect(state.ranges).toEqual([0,1000,2000]);expect(r.data?.[0].tentative).toBe(2);
  });
  it('read error on second page returns no partial verdict',async()=>{
    state.failAt=1000;const r=await lireResultatsQuizEleve('u');expect(r.data).toBeNull();expect(r.error?.code).toBe('network');state.failAt=-1;
  });
  it('real antignac IDs: stored T2 wins over a later dated T1; reset hides neither another exam nor future rows',async()=>{
    state.rows=[
      {id:'04298836-81c2-4bce-b70c-4d95095f5c19',apprenant_id:'u',quiz_type:'examen_blanc',quiz_id:'EB1',matiere_id:'t3p',tentative:2,score_obtenu:12,score_max:20,completed_at:'2026-10-01',created_at:'2026-10-01',details:{}},
      {id:'18ec0ab4-eac6-4952-a935-de8ee68dedef',apprenant_id:'u',quiz_type:'examen_blanc',quiz_id:'EB1',matiere_id:'t3p',tentative:1,score_obtenu:10,score_max:20,completed_at:'2026-11-01',created_at:'2026-11-01',details:{}},
    ];
    const r=await lireResultatsQuizEleve('u');
    expect(lignesExamenAffichees(r.data,[]).map(x=>x.id)).toEqual(['04298836-81c2-4bce-b70c-4d95095f5c19']);
    expect(lignesExamenAffichees(r.data,[{exam_id:'EB1',cutoff_at:'2026-11-02'}])).toEqual([]);
  });
});