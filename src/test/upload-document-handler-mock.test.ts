// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { documentValidation, DOCUMENT_MAX_BYTES, verifyOnboardingDocumentToken } from '../../supabase/functions/_shared/documentUploadRules';

/** Executes the real handler with entirely in-memory database/storage/auth. */
function harness(owner: string | null = 'owner', learnerOwner = 'owner') {
  const records = new Map<string, any>(); const files = new Map<string, Uint8Array>();
  const effects = { uploads: 0, inserts: 0, alerts: 0, failInsert: false, admins: false };
  const bucket = {
    upload: async (path: string, buffer: ArrayBuffer) => {
      if (files.has(path)) return { error: { message: 'exists' } };
      files.set(path, new Uint8Array(buffer)); effects.uploads++; return { error: null };
    },
    download: async (path: string) => ({ data: files.has(path) ? new Blob([new Uint8Array(files.get(path) ?? []).buffer]) : null }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://synthetic.test/${path}` } }),
  };
  const sb = {
    auth: { getUser: async () => ({ data: { user: owner ? { id: owner } : null } }) },
    rpc: async () => ({ data: effects.admins, error: null }),
    storage: { from: () => bucket },
    from: (table: string) => {
      let id = '';
      const q: any = {
        select: () => q, eq: (_column: string, value: string) => { id = value; return q; },
        single: async () => ({ data: { id, nom: 'SYNTHETIC', prenom: 'ONLY', auth_user_id: learnerOwner }, error: null }),
        maybeSingle: async () => ({ data: records.get(id) ?? null, error: null }),
        insert: async (record: any) => {
          if (table === 'alertes_systeme') { effects.alerts++; return { error: null }; }
          if (effects.failInsert) return { error: { code: 'synthetic-failure' } };
          if (records.has(record.id)) return { error: { code: '23505' } };
          records.set(record.id, record); effects.inserts++; return { error: null };
        },
      }; return q;
    },
  };
  let handler: (req: Request) => Promise<Response> = async () => new Response('', { status: 500 });
  const source = readFileSync('supabase/functions/upload-document-inscription/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('Deno', 'createClient', 'corsHeaders', 'DOCUMENT_MAX_BYTES', 'documentValidation', 'verifyOnboardingDocumentToken', js)(
    { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://synthetic.test' : 'synthetic-secret' }, serve: (fn: typeof handler) => { handler = fn; } },
    () => sb, { 'Access-Control-Allow-Origin': '*' }, DOCUMENT_MAX_BYTES, documentValidation, verifyOnboardingDocumentToken,
  );
  const request = async (operation: string, content = 'synthetic', token = '') => {
    const form = new FormData(); form.set('file', new File([content], 'synthetic.pdf', { type: 'application/pdf' }));
    form.set('apprenant_id', '11111111-1111-4111-8111-111111111111'); form.set('type_document', 'permis');
    form.set('operation_id', operation); if (token) form.set('session_token', token);
    return handler(new Request('https://synthetic.test/upload', { method: 'POST', body: form, headers: { authorization: 'Bearer synthetic-token' } }));
  };
  return { handler, request, records, files, effects };
}
const op = '22222222-2222-4222-8222-222222222222';
describe('Real upload handler under mocked services', () => {
  it('preflight works without auth and creates nothing', async () => {
    const h = harness(null); const res = await h.handler(new Request('https://synthetic.test', { method: 'OPTIONS' }));
    expect(res.status).toBe(200); expect(await res.text()).toBe('ok'); expect(h.effects.inserts).toBe(0);
  });
  it('requires session, forbids foreign dossier and retains originals', async () => {
    const anonymous = harness(null); expect((await anonymous.request(op)).status).toBe(401); expect(anonymous.files.size).toBe(0);
    const foreign = harness('other'); expect((await foreign.request(op)).status).toBe(403); expect(foreign.records.size).toBe(0);
  });
  it('exact retry returns one archive and only one alert, content conflict rejected', async () => {
    const h = harness(); const first = await h.request(op); const receipt = await first.json();
    expect(first.status).toBe(200); expect(receipt.confirmed).toBe(true); expect(receipt.operationId).toBe(op);
    expect((await h.request(op)).status).toBe(200);
    expect(h.effects).toMatchObject({ uploads: 1, inserts: 1, alerts: 1 });
    expect((await h.request(op, 'other-content')).status).toBe(409);
    expect(h.records.size).toBe(1);
  });
  it('database failure retains file; same operation resumes without re-upload or deletion', async () => {
    const h = harness(); h.effects.failInsert = true;
    expect((await h.request(op)).status).toBe(500); expect(h.files.size).toBe(1); expect(h.records.size).toBe(0);
    h.effects.failInsert = false;
    expect((await h.request(op)).status).toBe(200); expect(h.effects.uploads).toBe(1); expect(h.records.size).toBe(1);
  });
  it('a second version does not replace the first', async () => {
    const h = harness(); await h.request(op); await h.request('33333333-3333-4333-8333-333333333333', 'second');
    expect(h.records.size).toBe(2); expect(h.files.size).toBe(2);
  });
});