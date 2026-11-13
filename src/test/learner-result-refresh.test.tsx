import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearnerResultRefresh } from '@/hooks/useLearnerResultRefresh';
import { useCoreChangeTick } from '@/hooks/useCoreChangeTick';
const h=vi.hoisted(()=>({events:[] as (()=>void)[],tables:[] as string[],statuses:[] as ((s:string)=>void)[],removed:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{channel:()=>{const c={on:(_e:any,f:any,cb:any)=>{h.tables.push(f.table);h.events.push(cb);return c;},subscribe:(cb:any)=>{h.statuses.push(cb);return c;}};return c;},removeChannel:h.removed}}));
beforeEach(()=>{vi.useFakeTimers();h.events=[];h.statuses=[];h.removed.mockClear();});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('QRC event catch-up',()=>{
  it('refreshes attempt-only finalization without a legacy result mutation',()=>{
    h.tables=[];
    const {result}=renderHook(()=>useCoreChangeTick('learner'));
    const index=h.tables.indexOf('exam_attempts_v2');
    expect(index).toBeGreaterThanOrEqual(0);
    act(()=>{h.events[index]();vi.advanceTimersByTime(400);});expect(result.current).toBe(1);
  });
  it('cards, detail and CRM also refresh on a legacy result correction without remount',()=>{
    h.tables=[];
    const {result}=renderHook(()=>useCoreChangeTick('zine'));
    const index=h.tables.indexOf('apprenant_quiz_results');
    expect(index).toBeGreaterThanOrEqual(0);
    act(()=>{h.events[index]();vi.advanceTimersByTime(400);});expect(result.current).toBe(1);
  });
  it('coalesces corrections at 400ms, resume at 400ms and one 2400ms read, no recurring polling',()=>{
    const {result}=renderHook(()=>useLearnerResultRefresh('a'));
    act(()=>{h.events[0]();h.events[1]();vi.advanceTimersByTime(399);});expect(result.current).toBe(0);
    act(()=>vi.advanceTimersByTime(1));expect(result.current).toBe(1);
    act(()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'));h.statuses[0]('SUBSCRIBED');vi.advanceTimersByTime(400);});expect(result.current).toBe(2);
    act(()=>vi.advanceTimersByTime(2000));expect(result.current).toBe(3);
    act(()=>vi.advanceTimersByTime(60000));expect(result.current).toBe(3);
  });
  it('ignores old learner callbacks and removes all timers/channels',()=>{
    const {result,rerender,unmount}=renderHook(({id})=>useLearnerResultRefresh(id),{initialProps:{id:'a'}});
    const old=h.events[0];act(()=>{old();});rerender({id:'b'});
    act(()=>{old();vi.advanceTimersByTime(3000);});expect(result.current).toBe(0);
    act(()=>{h.events.at(-1)?.();vi.advanceTimersByTime(400);});expect(result.current).toBe(1);
    unmount();expect(h.removed).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
  });
});