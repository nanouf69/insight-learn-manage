import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
const h=vi.hoisted(()=>({ pending: null as any }));
vi.mock('@/integrations/supabase/client',()=>({supabase:{channel:()=>{const c={on:()=>c,subscribe:()=>c};return c;},removeChannel:vi.fn()}}));
vi.mock('@/lib/qrcInstances',async importOriginal=>({...(await importOriginal<any>()),fetchLearnerQrcPending:async()=>h.pending}));
import { useQrcEnginePending } from '@/hooks/useQrcEnginePending';
import { buildQrcAttemptId } from '@/lib/qrcInstances';
import { legacyEnginePendingForRows } from '@/components/cours-en-ligne/exam-helpers';
afterEach(cleanup);
describe('Legacy QRC pending is scoped to recorded subject attempt',()=>{
  it('old T1 pending cannot hide submitted T2; T1 still pending; unknown stays guarded',async()=>{
    h.pending={pendingByMatiere:new Set(['t3p']),pendingTotal:1,pendingAttemptIds:new Set([buildQrcAttemptId('u','EB2','t3p',1)])};
    const {result}=renderHook(()=>useQrcEnginePending('u',['EB2']));
    await waitFor(()=>expect(result.current.isExamPending('EB2')).toBe(true));
    const pending=(mid:string,row:any)=>result.current.isMatierePending('EB2',mid,row);
    expect(legacyEnginePendingForRows([{matiere_id:'t3p',tentative:2}],pending)).toBe(false);
    expect(legacyEnginePendingForRows([{matiere_id:'t3p',tentative:1}],pending)).toBe(true);
    expect(legacyEnginePendingForRows([{matiere_id:'t3p'}],pending)).toBe(true);
    expect(legacyEnginePendingForRows([{matiere_id:'t3p',tentative:2,__core:{pending:true}}],pending)).toBeNull();
  });
});