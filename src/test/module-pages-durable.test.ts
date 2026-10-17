import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: 'synthetic-A', fail: false, saved: [] as number[], calls: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: state.owner } } } }) },
  rpc: async (_name: string, args: any) => { state.calls.push(args); if (state.fail) return { error: { code: '42501' } }; state.saved = [...new Set([...state.saved, ...args._pages])]; return { error: null }; },
  from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { pages_completees: state.saved }, error: null }) }; return q; },
} }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionCall: (call: () => unknown) => call() }));
vi.mock('@/lib/learnerPreviewGuard', () => ({ blockLearnerWrite: () => false }));
import { queueModulePages, pendingModulePages, resumeModulePages } from '@/lib/modulePagesPersistence';
describe('Pages retained until exact server readback', () => {
  beforeEach(() => { state.owner = 'synthetic-A'; state.fail = false; state.saved = []; state.calls = []; localStorage.clear(); });
  it('refused page stays durable and another account cannot send it', async () => {
    state.fail = true;
    expect(await queueModulePages('synthetic-learner', 8, [3], 25)).toBe(false);
    expect(pendingModulePages('synthetic-A', 'synthetic-learner', 8)).toEqual([3]);
    const stored = JSON.parse(localStorage.getItem('module_pages_pending_v1:synthetic-A:synthetic-learner:8') ?? '{}');
    expect(stored.pages).toEqual([3]);
    expect(stored.confirmed).not.toBe(true);
  });
  it('account switch retains A, then owner reconnection confirms union', async () => {
    state.fail = true;
    await queueModulePages('synthetic-learner2', 8, [1], 10);
    await queueModulePages('synthetic-learner2', 8, [2], 20);
    const before = state.calls.length;
    state.owner = 'synthetic-B'; state.fail = false; await resumeModulePages();
    expect(state.calls).toHaveLength(before);
    state.owner = 'synthetic-A'; await resumeModulePages();
    expect(state.saved).toEqual(expect.arrayContaining([1, 2]));
    const record = JSON.parse(localStorage.getItem('module_pages_pending_v1:synthetic-A:synthetic-learner2:8') ?? '{}');
    expect(record.confirmed).toBe(true);
    expect(record.pages).toEqual([1, 2]);
  });
});