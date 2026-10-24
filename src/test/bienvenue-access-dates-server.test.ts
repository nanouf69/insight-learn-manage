// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { transformSync } from 'esbuild';
import { expect, it, vi } from 'vitest';

async function harness(result: unknown, tokenValid: boolean) {
  let handler: ((r: Request) => Promise<Response>) | undefined;
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(result) };
  const from = vi.fn().mockReturnValue(chain);
  const source = readFileSync('supabase/functions/onboarding-invitation/index.ts', 'utf8').replace('import { createClient } from "npm:@supabase/supabase-js@2";', 'const createClient = globalThis.testClient;');
  const code = transformSync(source, { loader: 'ts', format: 'cjs' }).code;
  runInNewContext(code, { testClient: () => ({ from }), TextEncoder, crypto: webcrypto, Request, Response, console, Deno: { env: { get: () => 'fictitious-secret' }, serve: (fn: typeof handler) => { handler = fn; } } });
  const id = '00000000-0000-4000-8000-000000000001';
  const exp = Math.floor(Date.now() / 1000) + 60;
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode('fictitious-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = Buffer.from(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(`onboarding:${id}:${exp}`))).toString('hex');
  if (!handler) throw new Error('Handler absent');
  const response = await handler(new Request('https://fictitious.invalid', { method: 'POST', body: JSON.stringify({ action: 'access_dates', apprenant_id: id, session_token: tokenValid ? `${exp}.${sig}` : 'invalid' }) }));
  return { response, body: await response.json(), from, chain, id };
}
it('ne lit aucune date sans le jeton personnel valide', async () => {
  const h = await harness({ data: null, error: null }, false);
  expect(h.response.status).toBe(403); expect(h.from).not.toHaveBeenCalled();
});
it('limite la lecture au dossier autorisé et aux champs prévus', async () => {
  const data = { id: 'fictif', type_apprenant: 'vtc-e', date_debut_cours_en_ligne: '2026-11-03', date_fin_cours_en_ligne: '2027-03-31' };
  const h = await harness({ data, error: null }, true);
  expect(h.response.status).toBe(200); expect(h.body).toEqual({ dossier: data });
  expect(h.chain.eq).toHaveBeenCalledWith('id', h.id);
  expect(h.chain.select).toHaveBeenCalledWith('id, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation');
});
it('une lecture échouée produit une erreur et jamais des dates vides affirmées', async () => {
  const h = await harness({ data: null, error: { message: 'fictitious failure' } }, true);
  expect(h.response.status).toBe(500); expect(h.body).not.toHaveProperty('dossier');
});