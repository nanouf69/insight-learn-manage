// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { statutEchecPersistance, traceSauvegarde } from '../../supabase/functions/upsert-reponse-apprenant/diagnostic';
it('contraintes définitives 400, indisponibilité et concurrence 503', () => {
  for (const c of ['23514', '23502', '22P02', 'P0530', '42501']) expect(statutEchecPersistance(c)).toBe(400);
  for (const c of ['08006', '40001', '40P01', '57014', '55P03', 'PGRST003', undefined]) expect(statutEchecPersistance(c)).toBe(503);
});
it('ne journalise jamais un contenu libre ni un jeton', () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  traceSauvegarde('fictitious-request', 'persistence_refused', 400, { reponses: 'private' }, '23514');
  const trace = JSON.parse(log.mock.calls[0][1]);
  expect(trace).toEqual({ request_id: 'fictitious-request', operation_id: null, stage: 'persistence_refused', status: 400, code: '23514' });
  log.mockRestore();
});