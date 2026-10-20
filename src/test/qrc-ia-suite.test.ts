// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { prochaineActionIa, MAX_ITEMS_SUITE } from '../../supabase/functions/_shared/qrcIaSuite';
const now = Date.parse('2026-10-20T10:00:00Z');
const trace = { statut: 'erreur', http_status: 503, termine_at: new Date(now - 60000).toISOString(), created_at: new Date(now - 200000).toISOString() };
describe('QRC automatic bounded continuation', () => {
 it('known finished 503 retries after cooldown, not immediately', () => {
  expect(prochaineActionIa(trace, now).action).toBe('appel');
  expect(prochaineActionIa({...trace,termine_at:new Date(now).toISOString()},now)).toEqual({action:'attendre',delai:60000});
 });
 it('429 uses cooldown and second receipt exhausts retries', () => {
  expect(prochaineActionIa({...trace,http_status:429},now).action).toBe('appel');
  expect(prochaineActionIa({...trace,numero:2},now).action).toBe('revue');
 });
 it('active or interrupted unknown work never calls AI again', () => {
  expect(prochaineActionIa({...trace,statut:'en_cours',termine_at:null},now).action).toBe('revue');
  expect(prochaineActionIa({...trace,http_status:499},now).action).toBe('revue');
 });
 it('provider denial/refusal/configuration are terminal, no fallback model', () => {
  for(const status of [200,400,401,402,403,404]) expect(prochaineActionIa({...trace,http_status:status},now).action).toBe('revue');
 });
 it('already corrected is skipped and invocation cap is concrete', () => {
  expect(prochaineActionIa({...trace,statut:'appliquee'},now).action).toBe('fin');
  expect(MAX_ITEMS_SUITE).toBe(24);
 });
});