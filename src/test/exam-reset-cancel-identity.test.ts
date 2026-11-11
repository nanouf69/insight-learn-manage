import {describe,it,expect} from 'vitest';
import {exactCancellationContext} from '@/lib/examResetCancellation';
const r={reset_id:'r',apprenant_id:'a',exam_id:'EB3-TAXI',cutoff_at:'2026-11-11T13:16:10Z',archived_attempt_ids:[],archived_core_result_ids:[],archived_legacy_result_ids:[]};
describe('exact reset identity',()=>{
 it('same immutable reset only',()=>{expect(exactCancellationContext(r,{...r,eligible:true,reason:'',cancelled:false})).toBe(true);});
 for(const key of ['reset_id','apprenant_id','exam_id','cutoff_at'] as const) it(`rejects changed ${key}`,()=>{expect(exactCancellationContext(r,{...r,[key]:'other',eligible:true,reason:'',cancelled:false})).toBe(false);});
});