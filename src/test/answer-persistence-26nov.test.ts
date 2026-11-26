// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({supabase:{auth:{getSession:async()=>({data:{session:null}})}}}));
let api: typeof import('@/lib/answerPersistence');
const payload = (answers = {q:['A']}, exercise = 'module_4_exo_105') => ({apprenant_id:'A',user_id:'U',exercice_id:exercise,exercice_type:'quiz',reponses:answers});
const ack = (init: RequestInit) => ({ok:true,json:async()=>({success:true,confirmed:true,write_seq:1,accepted_event_ids:JSON.parse(String(init.body)).events.map((e:any)=>e.event_id)})});
beforeEach(async()=>{
  vi.resetModules(); vi.useFakeTimers();
  const storage = new Map<string,string>();
  vi.stubGlobal('localStorage',{get length(){return storage.size},key:(i:number)=>[...storage.keys()][i]??null,getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});
  api = await import('@/lib/answerPersistence'); api.setAnswerSaveAuthToken('token','U'); api.setAnswerSaveOwnership({apprenantId:'A'});
});
afterEach(()=>{api.setAnswerSaveAuthToken(null,null);vi.useRealTimers();vi.unstubAllGlobals();});
describe('26 novembre: durable receipts and identity',()=>{
  it('frozen journal acknowledgement never becomes saved or permits finalization',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({success:true,confirmed:true,frozen:true})})));
    const states:string[]=[];api.subscribeAnswerSaveState(s=>states.push(s));states.length=0;api.enqueueAnswerSave(payload());
    await vi.advanceTimersByTimeAsync(1);
    expect(api.getBlockedAnswerSavesFor('A','module_4_exo_105')).toBe(1);
    expect(api.getPendingAnswers('A','module_4_exo_105')).toEqual({q:['A']});
    expect(states).not.toContain('saved');
    await expect(api.flushAnswerSavesAndWait('A','module_4_exo_105')).resolves.toBe(false);
  });
  it('new typing retains a definitive refusal and its exact original operation',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:403,text:async()=> 'permission denied'})));
    api.enqueueAnswerSave(payload());await vi.advanceTimersByTimeAsync(1);
    const original=JSON.parse(localStorage.getItem('answer_save_queue_v1')??'[]')[0];
    api.enqueueAnswerSave(payload({q:['B']})); await vi.advanceTimersByTimeAsync(1);
    const queue=JSON.parse(localStorage.getItem('answer_save_queue_v1')??'[]');
    expect(queue.find((q:any)=>q.id===original.id)).toMatchObject({blocked:true,payload:{reponses:{q:['A']}}});
  });
  it('input during network backoff does not bypass retry deadline',async()=>{
    const fetch=vi.fn(async()=>{throw Error('offline')});vi.stubGlobal('fetch',fetch);
    api.enqueueAnswerSave(payload());await vi.advanceTimersByTimeAsync(1);
    const retry=JSON.parse(localStorage.getItem('answer_save_queue_v1')??'[]')[0].retry_after;
    api.enqueueAnswerSave(payload({q:['B']}));await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('answer_save_queue_v1')??'[]').every((q:any)=>q.retry_after===retry)).toBe(true);
  });
  it.each(['json','text'])('account change during %s parsing cannot acknowledge or reject for the new account',async body=>{
    let resolve:(v:any)=>void=()=>{};
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:body==='json',status:403,[body]:()=>new Promise(r=>{resolve=r})})));
    api.enqueueAnswerSave(payload());await vi.advanceTimersByTimeAsync(1);
    api.setAnswerSaveAuthToken('token2','V');api.setAnswerSaveOwnership({apprenantId:'B'});
    resolve(body==='json'?{success:true,confirmed:true,write_seq:99}:'permission denied');await vi.advanceTimersByTimeAsync(1);
    expect(api.getAnswerSaveRejectionFor('B','module_4_exo_105')).toBeNull();
    api.setAnswerSaveAuthToken(null,null);api.setAnswerSaveOwnership({apprenantId:'A'});
    expect(api.getPendingAnswers('A','module_4_exo_105')).toEqual({q:['A']});
    expect(api.getConfirmedWriteSeq('A','module_4_exo_105')).toBe(0);
  });
  it('legacy whole-array overwrite cannot erase independent operation records; reload restores them',async()=>{
    api.setAnswerSaveAuthToken(null,'U');api.enqueueAnswerSave(payload());api.enqueueAnswerSave(payload({q:['B']},'other'));
    localStorage.setItem('answer_save_queue_v1','[]');
    vi.resetModules();const reloaded=await import('@/lib/answerPersistence');reloaded.setAnswerSaveAuthToken(null,'U');reloaded.setAnswerSaveOwnership({apprenantId:'A'});
    expect(reloaded.getPendingAnswerSaves()).toBe(2);
    expect(reloaded.getPendingAnswers('A','other')).toEqual({q:['B']});
  });
  it('expired token pauses exact operation until same-owner reconnection',async()=>{
    const fetch=vi.fn(async()=>({ok:false,status:401,text:async()=> 'JWT expired'}));vi.stubGlobal('fetch',fetch);
    api.enqueueAnswerSave(payload());await vi.advanceTimersByTimeAsync(1);
    const before=JSON.parse(localStorage.getItem('answer_save_queue_v1')??'[]')[0];
    await vi.advanceTimersByTimeAsync(40000); expect(fetch).toHaveBeenCalledTimes(1);
    vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>ack(init)));
    api.setAnswerSaveAuthToken('new-token','U');await vi.advanceTimersByTimeAsync(1);
    expect(api.getPendingAnswerSaves()).toBe(0);
    expect(localStorage.getItem('answer_save_item_v2:'+before.id)).toContain('module_4_exo_105');
  });
});