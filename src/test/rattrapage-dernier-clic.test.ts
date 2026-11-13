// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { transformSync } from 'esbuild';
import { expect, it, vi } from 'vitest';
import { statutEchecPersistance, traceSauvegarde } from '../../supabase/functions/upsert-reponse-apprenant/diagnostic';
import * as originauxExacts from '../../supabase/functions/upsert-reponse-apprenant/originauxExacts';

// Données fictives uniquement : aucun appel réseau, aucune base réelle.
type Ligne = { question_id: string; valeur: unknown; user_id: string | null; client_saved_at: string | null; created_at: string };

async function invoke(opts: {
  reponses: Record<string, unknown>;
  stored: Record<string, unknown>;
  skipped: string[];
  journal: Ligne[];
  completed?: boolean;
  secondSkipped?: string[];
}) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const rpc = vi.fn()
    .mockResolvedValueOnce({ data: [{ saved: true, stored_reponses: opts.stored, stored_write_seq: 9, frozen: false, skipped_questions: opts.skipped, accepted_event_ids: [] }], error: null })
    .mockImplementationOnce(async (_n: string, args: any) => ({ data: [{ saved: true, stored_reponses: { ...opts.stored, ...args.p_reponses }, stored_write_seq: 10, frozen: false, skipped_questions: opts.secondSkipped ?? [], accepted_event_ids: [] }], error: null }));
  const learner = { select: () => learner, eq: () => learner, maybeSingle: async () => ({ data: { id: 'learner', auth_user_id: 'owner' }, error: null }) };
  const journal: any = { select: () => journal, eq: () => journal, in: () => journal, order: () => journal, limit: async () => ({ data: opts.journal, error: null }) };
  const source = readFileSync('supabase/functions/upsert-reponse-apprenant/index.ts', 'utf8')
    .replace('import { createClient } from "npm:@supabase/supabase-js@2";', 'const createClient = globalThis.client;')
    .replace("import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';", 'const corsHeaders = {"Access-Control-Allow-Origin":"*"};')
    .replace("import { statutEchecPersistance, traceSauvegarde } from './diagnostic.ts';", 'const {statutEchecPersistance,traceSauvegarde} = globalThis.diagnostic;')
    .replace("import { canonique, cleAvecNul, contientNul, lireOriginal, lireReponsesExactes, preparerLotSansNul } from './originauxExacts.ts';", 'const {canonique,cleAvecNul,contientNul,lireOriginal,lireReponsesExactes,preparerLotSansNul} = globalThis.originauxExacts;');
  runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, {
    Request, Response, URL, crypto: webcrypto, console, exports: {},
    diagnostic: { statutEchecPersistance, traceSauvegarde }, originauxExacts,
    client: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) }, from: (t: string) => (t === 'apprenants' ? learner : journal), rpc }),
    Deno: { env: { get: () => 'fictitious' }, serve: (fn: typeof handler) => { handler = fn; } },
  });
  const response = await handler!(new Request('https://fictitious.invalid', { method: 'POST', headers: { Authorization: 'Bearer x' }, body: JSON.stringify({ operation_id: 'module_5_exo_505__fictif', apprenant_id: '11111111-1111-4111-8111-111111111111', exercice_id: 'module_5_exo_505', exercice_type: 'quiz', reponses: opts.reponses, completed: opts.completed ?? false, base_seq: 3 }) }));
  return { body: await response.json(), rpc };
}
const j = (q: string, valeur: unknown, client: string, user = 'owner'): Ligne => ({ question_id: q, valeur, user_id: user, client_saved_at: client, created_at: client });

it('multi-réponses : [D] enregistré, dernier clic [D,B] journalisé par ce compte → appliqué, plus de conflit', async () => {
  const r = await invoke({ reponses: { '505-15': ['D', 'B'] }, stored: { '505-15': ['D'] }, skipped: ['505-15'],
    journal: [j('505-15', ['D'], '2026-11-13T17:55:28Z'), j('505-15', ['D', 'B'], '2026-11-13T17:55:36Z')] });
  expect(r.rpc).toHaveBeenCalledTimes(2);
  expect(r.rpc.mock.calls[1][1].p_reponses).toEqual({ '505-15': ['D', 'B'] });
  expect(r.rpc.mock.calls[1][1].p_base_seq).toBe(9);
  expect(r.rpc.mock.calls[1][1].p_events).toEqual([]);
  expect(r.body.skipped_questions).toEqual([]);
  expect(r.body.write_seq).toBe(10);
});
it('ancien écran rejouant une valeur dépassée → jamais appliquée, conflit conservé', async () => {
  const r = await invoke({ reponses: { '505-52': ['C'] }, stored: { '505-52': ['B'] }, skipped: ['505-52'],
    journal: [j('505-52', ['C'], '2026-11-13T19:01:00Z'), j('505-52', ['B'], '2026-11-13T19:01:18Z')] });
  expect(r.rpc).toHaveBeenCalledTimes(1);
  expect(r.body.skipped_questions).toEqual(['505-52']);
});
it('dernier clic venant d\'un autre compte → refusé', async () => {
  const r = await invoke({ reponses: { q: ['A'] }, stored: { q: ['B'] }, skipped: ['q'],
    journal: [j('q', ['A'], '2026-11-13T19:00:00Z', 'autre')] });
  expect(r.rpc).toHaveBeenCalledTimes(1);
  expect(r.body.skipped_questions).toEqual(['q']);
});
it('valeur égale à celle enregistrée → plus signalée en conflit, aucune écriture', async () => {
  const r = await invoke({ reponses: { q: ['A'] }, stored: { q: ['A'] }, skipped: ['q'], journal: [] });
  expect(r.rpc).toHaveBeenCalledTimes(1);
  expect(r.body.skipped_questions).toEqual([]);
});
it('clôture (completed) → aucun rattrapage', async () => {
  const r = await invoke({ completed: true, reponses: { q: ['A'] }, stored: { q: ['B'] }, skipped: ['q'], journal: [j('q', ['A'], '2026-11-13T19:00:00Z')] });
  expect(r.rpc).toHaveBeenCalledTimes(1);
  expect(r.body.skipped_questions).toEqual(['q']);
});
it('course pendant le rattrapage (re-sautée) → reste en conflit', async () => {
  const r = await invoke({ reponses: { q: ['A'] }, stored: { q: ['B'] }, skipped: ['q'], journal: [j('q', ['A'], '2026-11-13T19:00:00Z')], secondSkipped: ['q'] });
  expect(r.rpc).toHaveBeenCalledTimes(2);
  expect(r.body.skipped_questions).toEqual(['q']);
});
it('revisionState jamais rattrapé', async () => {
  const r = await invoke({ reponses: { revisionState: { a: 1 } }, stored: { revisionState: { a: 0 } }, skipped: ['revisionState'], journal: [] });
  expect(r.rpc).toHaveBeenCalledTimes(1);
  expect(r.body.skipped_questions).toEqual(['revisionState']);
});
