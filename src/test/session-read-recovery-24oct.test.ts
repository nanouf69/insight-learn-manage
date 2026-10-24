import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ session: vi.fn(), fresh: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: m.session } } }));
vi.mock('@/lib/sessionExpiree', () => ({ assurerSessionFraiche: m.fresh, SESSION_EXPIREE_MESSAGE: 'Session expirée' }));
import { bounded, freshSessionCall, freshSessionRead } from '@/lib/sessionRpc';
beforeEach(() => { m.session.mockReset().mockResolvedValue({ data: { session: { user: { id: 'A' } } } }); m.fresh.mockReset().mockResolvedValue('fresh'); });
afterEach(() => vi.useRealTimers());
it('après 42501 une seule relecture sous le même compte, aucune publication', async () => {
  const read = vi.fn().mockResolvedValueOnce({ data: null, error: { code: '42501' } }).mockResolvedValueOnce({ data: ['version-fictive'], error: null });
  expect(await freshSessionCall(read)).toEqual({ data: ['version-fictive'], error: null });
  expect(read).toHaveBeenCalledTimes(2);
});
it('un compte changé pendant le renouvellement ne relit pas sous le suivant', async () => {
  const read = vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } });
  m.fresh.mockImplementationOnce(async () => 'fresh').mockImplementationOnce(async () => { m.session.mockResolvedValue({ data: { session: { user: { id: 'B' } } } }); return 'other'; });
  await expect(freshSessionCall(read)).rejects.toMatchObject({ sessionAbsente: true });
  expect(read).toHaveBeenCalledTimes(1);
});
it('lecture bloquée : délai distinct d’une version réellement absente', async () => {
  vi.useFakeTimers();
  const result = bounded(new Promise(() => {}), 100).catch(e => e);
  await vi.advanceTimersByTimeAsync(110);
  expect(await result).toMatchObject({ code: 'READ_TIMEOUT' });
});
it('500 de lecture transitoire : une seule reprise, alors que vide confirmé n’est pas réessayé', async () => {
  vi.useFakeTimers();
  const read = vi.fn().mockResolvedValueOnce({ data: null, error: { status: 503 } }).mockResolvedValueOnce({ data: ['version'], error: null });
  const result = freshSessionRead(read);
  await vi.advanceTimersByTimeAsync(600);
  expect(await result).toEqual({ data: ['version'], error: null }); expect(read).toHaveBeenCalledTimes(2);
  const empty = vi.fn().mockResolvedValue({ data: [], error: null });
  expect(await freshSessionRead(empty)).toEqual({ data: [], error: null }); expect(empty).toHaveBeenCalledTimes(1);
});