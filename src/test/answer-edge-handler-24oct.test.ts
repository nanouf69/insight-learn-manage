// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { transformSync } from 'esbuild';
import { expect, it, vi } from 'vitest';
import { statutEchecPersistance, traceSauvegarde } from '../../supabase/functions/upsert-reponse-apprenant/diagnostic';

async function invoke(code?: string, authenticated = true) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const rpc = vi.fn().mockResolvedValue({ data: code ? null : [{ saved: true, stored_write_seq: 3, frozen: false }], error: code ? { code, message: 'Test error', details: 'must never be returned' } : null });
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { id: 'learner', auth_user_id: 'owner' }, error: null }) };
  const source = readFileSync('supabase/functions/upsert-reponse-apprenant/index.ts', 'utf8')
    .replace('import { createClient } from "npm:@supabase/supabase-js@2";', 'const createClient = globalThis.client;')
    .replace("import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';", 'const corsHeaders = {"Access-Control-Allow-Origin":"*"};')
    .replace("import { statutEchecPersistance, traceSauvegarde } from './diagnostic.ts';", 'const {statutEchecPersistance,traceSauvegarde} = globalThis.diagnostic;');
  runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, {
    Request, Response, URL, crypto: webcrypto, console,
    diagnostic: { statutEchecPersistance, traceSauvegarde },
    client: () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'owner' } : null }, error: null }) }, from: () => chain, rpc }),
    Deno: { env: { get: () => 'fictitious' }, serve: (fn: typeof handler) => { handler = fn; } },
  });
  if (!handler) throw new Error('Handler absent');
  const response = await handler(new Request('https://fictitious.invalid', { method: 'POST', headers: { Authorization: 'Bearer fictitious' }, body: JSON.stringify({ operation_id: 'EB2__fictitious_operation', apprenant_id: '11111111-1111-4111-8111-111111111111', exercice_id: 'EB2__fictitious', exercice_type: 'examen_blanc', reponses: { q1: 'fictitious-only' } }) }));
  return { response, body: await response.json(), rpc };
}
it('400 contraint : un seul appel et identifiant de diagnostic, aucune confirmation inventée', async () => {
  const result = await invoke('23514');
  expect(result.response.status).toBe(400); expect(result.body.code).toBe('23514');
  expect(result.body.request_id).toBeTruthy(); expect(result.body).not.toHaveProperty('confirmed');
  expect(result.body).not.toHaveProperty('details'); expect(result.rpc).toHaveBeenCalledTimes(1);
});
it('indisponibilité SQL temporaire ne devient plus un refus définitif 400', async () => {
  const result = await invoke('57014');
  expect(result.response.status).toBe(503); expect(result.rpc).toHaveBeenCalledTimes(1);
});
it('session expirée : 401, aucun appel de persistance', async () => {
  const result = await invoke(undefined, false);
  expect(result.response.status).toBe(401); expect(result.rpc).not.toHaveBeenCalled();
});
it('une confirmation serveur réussie n’est publiée qu’une fois par invocation', async () => {
  const result = await invoke();
  expect(result.response.status).toBe(200); expect(result.body).toMatchObject({ success: true, confirmed: true, write_seq: 3 });
  expect(result.rpc).toHaveBeenCalledTimes(1);
});