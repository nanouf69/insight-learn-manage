import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ pending: 1, fail: false, calls: 0 }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { access_token: 'synthetic' } } }) },
  rpc: async () => { state.calls++; if (state.fail) return { data: null, error: { code: '42501' } }; return { data: [{ is_valid: false, disconnect_reason: 'no_response' }], error: null }; },
} }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionCall: (fn: () => unknown) => fn() }));
vi.mock('@/lib/answerPersistence', () => ({ getPendingAnswerSaves: () => state.pending }));
vi.mock('@/lib/learnerPreviewGuard', () => ({ blockLearnerWrite: () => true }));
import { usePresenceCheck } from '@/hooks/usePresenceCheck';
describe('Session checks do not strand pending answers', () => {
  beforeEach(() => { state.pending = 1; state.fail = false; state.calls = 0; });
  it('server expiry never redirects with a retained answer', async () => {
    const disconnect = vi.fn();
    const hook = renderHook(() => usePresenceCheck({ apprenantId: 'synthetic', userId: 'synthetic-owner', connexionId: 'synthetic-connection', enabled: true, onForceDisconnect: disconnect }));
    await waitFor(() => expect(state.calls).toBe(1)); expect(disconnect).not.toHaveBeenCalled(); hook.unmount();
  });
  it('permission error is not an expired-session verdict or retry loop', async () => {
    state.fail = true; state.pending = 0; const disconnect = vi.fn();
    const hook = renderHook(() => usePresenceCheck({ apprenantId: 'synthetic', userId: 'synthetic-owner', connexionId: 'synthetic-connection', enabled: true, onForceDisconnect: disconnect }));
    await waitFor(() => expect(state.calls).toBe(1)); expect(disconnect).not.toHaveBeenCalled(); hook.unmount();
  });
});