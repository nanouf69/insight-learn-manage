import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), listener: null as null | (() => void), unsubscribe: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getSession: auth.getSession, getUser: auth.getUser,
  onAuthStateChange: (listener: () => void) => { auth.listener = listener; return { data: { subscription: { unsubscribe: auth.unsubscribe } } }; },
} } }));
import { useConnexionEleveConfirmee } from '@/hooks/useConnexionEleveConfirmee';

const opts = { embedded: false, userId: 'test-owner', authLoading: false };
async function tick(ms = 200) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 'fixture', user: { id: 'test-owner' }, expires_at: Date.now() / 1000 + 3600 } } });
  auth.getUser.mockResolvedValue({ data: { user: { id: 'test-owner' } }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Connexion élève au retour iPhone', () => {
  it('does not turn two session-read timeouts into a logout', async () => {
    auth.getSession.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useConnexionEleveConfirmee(opts));
    await tick(20000); expect(result.current).toBe('ok');
    expect(auth.getUser).not.toHaveBeenCalled();
  });
  it('still refuses a definitely missing local session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useConnexionEleveConfirmee(opts));
    await tick(3000); expect(result.current).toBe('absente');
  });
  it('coalesces initial/auth/resume events into one server verification', async () => {
    renderHook(() => useConnexionEleveConfirmee(opts));
    act(() => { auth.listener?.(); auth.listener?.(); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
    await tick(); expect(auth.getUser).toHaveBeenCalledTimes(1);
  });
  it('never calls auth reads synchronously inside the auth callback', async () => {
    renderHook(() => useConnexionEleveConfirmee(opts)); await tick();
    auth.getSession.mockClear();
    act(() => auth.listener?.());
    expect(auth.getSession).not.toHaveBeenCalled();
    await tick(); expect(auth.getSession).toHaveBeenCalledTimes(1);
  });
  it('still rechecks revocation at the existing 60 second interval', async () => {
    renderHook(() => useConnexionEleveConfirmee(opts)); await tick();
    await tick(60000); expect(auth.getUser).toHaveBeenCalledTimes(2);
  });
  it('requires the same account in both local and server proofs', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'other-owner' } }, error: null });
    const { result } = renderHook(() => useConnexionEleveConfirmee(opts));
    await tick(3000); expect(result.current).toBe('absente');
  });
  it('does not hide an expired/revoked session', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    const { result } = renderHook(() => useConnexionEleveConfirmee(opts));
    await tick(3000); expect(result.current).toBe('absente');
  });
  it('keeps visible work during a transient network failure', async () => {
    auth.getUser.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useConnexionEleveConfirmee(opts));
    await tick(); expect(result.current).toBe('ok');
  });
  it('does not verify on hidden pages or after unmount', async () => {
    const { unmount } = renderHook(() => useConnexionEleveConfirmee(opts)); await tick();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange'))); await tick();
    expect(auth.getUser).toHaveBeenCalledTimes(1);
    unmount(); await tick(60000); expect(auth.getUser).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});