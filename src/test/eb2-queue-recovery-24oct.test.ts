import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ fresh: vi.fn() }));
vi.mock('@/lib/sessionExpiree', () => ({ assurerSessionFraiche: auth.fresh }));
const A = 'fictitious-user-A', B = 'fictitious-user-B', learner = 'fictitious-learner-A';
const item = { id: 'EB2__reglementation_vtc__1792632294612__3529fe', payload: { apprenant_id: learner, user_id: A, exercice_id: 'EB2__reglementation_vtc', exercice_type: 'examen_blanc', reponses: { q1: ['A'] }, completed: true }, owner_user_id: A, queued_at: '2026-10-22T01:24:54Z', attempts: 0 };
let p: typeof import('@/lib/answerPersistence');
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); localStorage.clear();
  auth.fresh.mockReset().mockResolvedValue('fresh');
  fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  p = await import('@/lib/answerPersistence');
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const start = async () => {
  localStorage.setItem('answer_save_queue_v1', JSON.stringify([item]));
  p.setAnswerSaveOwnership({ apprenantId: learner }); p.setAnswerSaveAuthToken('old', A);
  await vi.advanceTimersByTimeAsync(100);
};
it('400 définitif reste conservé et ne repart pas lors d’une reconnexion', async () => {
  fetcher.mockResolvedValue({ ok: false, status: 400, text: async () => '{"code":"23514","error":"violates check constraint"}' });
  await start();
  expect(fetcher).toHaveBeenCalledTimes(1);
  p.setAnswerSaveAuthToken(null); p.setAnswerSaveAuthToken('new', A);
  await vi.advanceTimersByTimeAsync(40000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem('answer_save_queue_v1') || '[]')[0].payload).toEqual(item.payload);
});
it('401 ne boucle pas si le renouvellement échoue ; reprend au nouveau jeton du même compte', async () => {
  auth.fresh.mockResolvedValue(null);
  fetcher.mockResolvedValue({ ok: false, status: 401, text: async () => '{"error":"Unauthorized"}' });
  await start(); await vi.advanceTimersByTimeAsync(40000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ success: true, confirmed: true, write_seq: 1 }) });
  auth.fresh.mockResolvedValue('new'); p.setAnswerSaveAuthToken('new', A);
  await vi.advanceTimersByTimeAsync(100);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(p.getPendingAnswerSavesFor(learner, item.payload.exercice_id)).toBe(0);
});
it('400 définitif n’affiche jamais une finalisation confirmée', async () => {
  fetcher.mockResolvedValue({ ok: false, status: 400, text: async () => '{"code":"23514"}' });
  await start();
  const done = p.flushAnswerSavesAndWait(learner, item.payload.exercice_id, 100);
  await vi.advanceTimersByTimeAsync(200);
  expect(await done).toBe(false);
});
it('500 réessaie avec espacement ; aucune opération du compte suivant n’est envoyée', async () => {
  fetcher.mockResolvedValue({ ok: false, status: 500, text: async () => '{}' });
  await start();
  const done = p.flushAnswerSavesAndWait(learner, item.payload.exercice_id, 500);
  await vi.advanceTimersByTimeAsync(600); expect(await done).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
  p.setAnswerSaveAuthToken('other', B); p.setAnswerSaveOwnership({ apprenantId: 'learner-B' });
  await vi.advanceTimersByTimeAsync(40000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem('answer_save_queue_v1') || '[]')[0].payload).toEqual(item.payload);
});