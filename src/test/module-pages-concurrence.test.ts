import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  owner: 'synthetic-A', rpcError: null as any, readError: null as any, dropOnSave: [] as number[],
  saved: {} as Record<string, number[]>, calls: [] as any[], gate: null as null | Promise<void>, onRpc: null as null | (() => void),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: state.owner } } } }), onAuthStateChange: () => {} },
  rpc: async (_n: string, a: any) => {
    state.calls.push({ ...a, owner: state.owner });
    state.onRpc?.();
    if (state.gate) await state.gate;
    if (state.rpcError) return { error: state.rpcError };
    const k = `${a._apprenant_id}:${a._module_id}`;
    state.saved[k] = [...new Set([...(state.saved[k] ?? []), ...a._pages.filter((p: number) => !state.dropOnSave.includes(p))])];
    return { error: null };
  },
  from: () => { const f: any = {}; const q: any = { select: () => q, eq: (c: string, v: any) => { f[c] = v; return q; },
    maybeSingle: async () => state.readError ? { data: null, error: state.readError } : ({ data: { pages_completees: state.saved[`${f.apprenant_id}:${f.module_id}`] ?? [] }, error: null }) }; return q; },
} }));
vi.mock('@/lib/sessionRpc', () => ({
  freshSessionCall: (call: () => unknown) => call(),
  authFailure: (e: any) => !!e && ['42501', 'PGRST301'].includes(e.code ?? ''),
}));
vi.mock('@/lib/learnerPreviewGuard', () => ({ blockLearnerWrite: () => false }));
import { queueModulePagesStatus, pendingModulePages } from '@/lib/modulePagesPersistence';
const rec = (o: string, a: string, m: number) => JSON.parse(localStorage.getItem(`module_pages_pending_v1:${o}:${a}:${m}`) ?? '{}');

describe('Progression des pages : attente, relance et confirmation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    Object.assign(state, { owner: 'synthetic-A', rpcError: null, readError: null, dropOnSave: [], saved: {}, calls: [], gate: null, onRpc: null });
    localStorage.clear();
  });

  it('deux pages simultanées du même module : les deux appels attendent et sont confirmés', async () => {
    const [a, b] = await Promise.all([queueModulePagesStatus('L1', 8, [1], 10), queueModulePagesStatus('L1', 8, [2], 20)]);
    expect(a).toBe('confirmed'); expect(b).toBe('confirmed');
    expect(state.saved['L1:8']).toEqual(expect.arrayContaining([1, 2]));
    expect(rec('synthetic-A', 'L1', 8).pages).toEqual([1, 2]);
  });

  it('page ajoutée pendant un envoi en cours : nouvelle passe, pas de fausse confirmation', async () => {
    let release!: () => void;
    state.gate = new Promise(r => { release = r; });
    let second: Promise<string> | null = null;
    state.onRpc = () => { state.onRpc = null; second = queueModulePagesStatus('L2', 8, [5], 50); setTimeout(() => {}, 0); queueMicrotask(() => { state.gate = null; release(); }); };
    const first = await queueModulePagesStatus('L2', 8, [4], 40);
    const res2 = await second!;
    expect(res2).toBe('confirmed');
    expect(['confirmed', 'pending']).toContain(first);
    expect(state.saved['L2:8']).toEqual(expect.arrayContaining([4, 5]));
    expect(rec('synthetic-A', 'L2', 8).confirmed).toBe(true);
  });

  it('deux modules différents sont envoyés et confirmés séparément', async () => {
    const [a, b] = await Promise.all([queueModulePagesStatus('L3', 8, [1], 10), queueModulePagesStatus('L3', 9, [2], 10)]);
    expect([a, b]).toEqual(['confirmed', 'confirmed']);
    expect(state.saved['L3:8']).toEqual([1]); expect(state.saved['L3:9']).toEqual([2]);
  });

  it('erreur serveur : file conservée, statut erreur (pas reconnexion), relance bornée', async () => {
    state.rpcError = { code: 'XX000', message: 'boom' };
    expect(await queueModulePagesStatus('L4', 8, [3], 10)).toBe('error');
    expect(pendingModulePages('synthetic-A', 'L4', 8)).toEqual([3]);
    for (let i = 0; i < 10; i++) { await vi.runOnlyPendingTimersAsync(); }
    expect(state.calls.length).toBeLessThanOrEqual(1 + 4);
    expect(rec('synthetic-A', 'L4', 8).confirmed).not.toBe(true);
  });

  it('erreur de session : statut auth, pas de relance automatique en boucle', async () => {
    state.rpcError = { code: '42501' };
    expect(await queueModulePagesStatus('L5', 8, [3], 10)).toBe('auth');
    await vi.runOnlyPendingTimersAsync();
    expect(state.calls).toHaveLength(1);
  });

  it('erreur de relecture : file conservée, jamais confirmée', async () => {
    state.readError = { code: 'XX000' };
    expect(await queueModulePagesStatus('L6', 8, [3], 10)).toBe('error');
    expect(rec('synthetic-A', 'L6', 8).confirmed).not.toBe(true);
    expect(pendingModulePages('synthetic-A', 'L6', 8)).toEqual([3]);
  });

  it('confirmation uniquement si toutes les pages sont relues côté serveur', async () => {
    state.dropOnSave = [7];
    expect(await queueModulePagesStatus('L7', 8, [6, 7], 20)).not.toBe('confirmed');
    expect(rec('synthetic-A', 'L7', 8).confirmed).not.toBe(true);
  });

  it("changement de compte : la file de A n'est jamais envoyée par B", async () => {
    state.rpcError = { code: '42501' };
    await queueModulePagesStatus('LA', 8, [1], 10);
    state.rpcError = null; state.owner = 'synthetic-B'; state.calls = [];
    await queueModulePagesStatus('LB', 8, [2], 10);
    expect(state.calls.every(c => c._apprenant_id === 'LB' && c.owner === 'synthetic-B')).toBe(true);
    expect(rec('synthetic-A', 'LA', 8).confirmed).not.toBe(true);
  });
});
