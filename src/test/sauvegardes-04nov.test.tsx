import { beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
const m = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn(), fresh: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: m.rpc, auth: { getSession: m.session } } }));
vi.mock('@/lib/sessionExpiree', () => ({ assurerSessionFraiche: m.fresh, SESSION_EXPIREE_MESSAGE: 'Session expirée' }));
vi.mock('@/lib/learnerPreviewGuard', () => ({ isLearnerPreviewReadOnly: () => false }));
import { chargerEtatCompletionServeur } from '@/lib/etatCompletionServeur';
import { useQuizEquipements, type TransportEquipements } from '@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements';
import { SERIE_SANCTIONS } from '@/components/cours-en-ligne/equipements-taxi-locale/CoursQuizEquipementsTaxi';

beforeEach(() => {
  localStorage.clear(); m.rpc.mockReset(); m.session.mockReset(); m.fresh.mockReset();
  m.session.mockResolvedValue({ data: { session: { user: { id: 'account-A' } } } }); m.fresh.mockResolvedValue('test-token');
});
it('absence de session : aucune lecture anonyme de progression', async () => {
  m.session.mockResolvedValue({ data: { session: null } });
  m.rpc.mockResolvedValue({ data: [], error: null });
  await expect(chargerEtatCompletionServeur('dossier-A')).rejects.toMatchObject({ sessionAbsente: true });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('42501 : un seul renouvellement forcé et reprise sous le même compte', async () => {
  m.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied for function etat_completion_modules' } })
    .mockResolvedValueOnce({ data: [{ module_id: 64, status: 'in_progress' }], error: null });
  expect((await chargerEtatCompletionServeur('dossier-A')).get(64)?.status).toBe('in_progress');
  expect(m.rpc).toHaveBeenCalledTimes(2);
  expect(m.fresh).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
});
it('changement de compte pendant le renouvellement : aucun appel avec B', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
  m.fresh.mockResolvedValueOnce('test-token').mockImplementationOnce(async () => {
    m.session.mockResolvedValue({ data: { session: { user: { id: 'account-B' } } } }); return 'other-test-token';
  });
  await expect(chargerEtatCompletionServeur('dossier-A')).rejects.toMatchObject({ sessionAbsente: true });
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
it('refus SQL persistant : erreur conservée, jamais progression vide de secours', async () => {
  const error = { code: '42501', message: 'permission denied for function etat_completion_modules' };
  m.rpc.mockResolvedValue({ data: null, error });
  await expect(chargerEtatCompletionServeur('dossier-A')).rejects.toEqual(error);
  expect(m.rpc).toHaveBeenCalledTimes(2);
});

function transportTest(options: { confirmation?: boolean; accuseTransport?: boolean } = {}) {
  let row: unknown = null;
  const envoyer = vi.fn(async (_compte, draft, termine, serie, score) => {
    if (score !== null) throw Object.assign(new Error('Questions complémentaires non notées'), { code: '23514' });
    if (options.confirmation !== false) row = { completed: termine, reponses: { version: serie.version, ...draft } };
    return options.accuseTransport !== false;
  });
  const transport: TransportEquipements = { lire: async () => row, envoyer };
  return { transport, envoyer };
}
async function remplir(result: { current: ReturnType<typeof useQuizEquipements> }) {
  await waitFor(() => expect(result.current.charge).toBe(true));
  act(() => { for (const q of SERIE_SANCTIONS.questions) result.current.modifier(q.id, String(q.correct)); });
}
it('20 réponses : score SQL NULL, double clic un seul envoi, confirmation après relecture', async () => {
  const t = transportTest(); const { result } = renderHook(() => useQuizEquipements('dossier-A', t.transport, SERIE_SANCTIONS));
  await remplir(result);
  await act(async () => { await Promise.all([result.current.enregistrer(true), result.current.enregistrer(true)]); });
  expect(t.envoyer).toHaveBeenCalledTimes(1);
  expect(t.envoyer.mock.calls[0]?.[4]).toBeNull(); expect(result.current.confirme).toBe(true);
});
it('ancienne opération refusée/accusé perdu : seul readback identique prouve la fin', async () => {
  const t = transportTest({ accuseTransport: false });
  const { result } = renderHook(() => useQuizEquipements('dossier-A', t.transport, SERIE_SANCTIONS)); await remplir(result);
  await act(async () => { await result.current.enregistrer(true); });
  expect(result.current.confirme).toBe(true);
});
it('transport OK sans readback : jamais confirmé et brouillon local intact', async () => {
  const t = transportTest({ confirmation: false });
  const { result } = renderHook(() => useQuizEquipements('dossier-A', t.transport, SERIE_SANCTIONS)); await remplir(result);
  await act(async () => { await result.current.enregistrer(true); });
  expect(result.current.confirme).toBe(false); expect(Object.keys(result.current.valeurs)).toHaveLength(20);
  expect(localStorage.length).toBeGreaterThan(0);
});