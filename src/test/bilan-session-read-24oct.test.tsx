import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ fresh: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionCall: m.fresh }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => { const query: any = { select: () => query, eq: () => query, then: (resolve: any) => Promise.resolve(m.read()).then(resolve) }; return query; } } }));
import { useBilanSnapshotsEleve } from '@/components/cours-en-ligne/bilanSnapshotsEleve';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('lecture pending n’est pas vide ; fin vide confirmée conserve le circuit legacy', async () => {
  let resolve: ((v: unknown) => void) | undefined;
  m.fresh.mockImplementation(() => new Promise(r => { resolve = r; }));
  const hook = renderHook(() => useBilanSnapshotsEleve('fictif', 5, true));
  expect(hook.result.current).toEqual({ statut: 'chargement' });
  await act(async () => { resolve?.({ data: [{ data: [], error: null }, { data: [], error: null }] }); });
  expect(hook.result.current).toMatchObject({ statut: 'pret', parExo: {} });
});
it('session absente distincte de lecture indisponible', async () => {
  m.fresh.mockRejectedValue({ sessionAbsente: true });
  const hook = renderHook(() => useBilanSnapshotsEleve('fictif', 5, true));
  await waitFor(() => expect(hook.result.current).toEqual({ statut: 'bloque', raison: 'session' }));
});
it('snapshot attendu mais réellement absent reste bloqué', async () => {
  m.fresh.mockResolvedValue({ data: [{ data: [], error: null }, { data: [{ exercice_id: 10, tentative: 1, categorie: 'VERT' }], error: null }] });
  const hook = renderHook(() => useBilanSnapshotsEleve('fictif', 5, true));
  await waitFor(() => expect(hook.result.current).toEqual({ statut: 'bloque', raison: 'snapshot_manquant' }));
});