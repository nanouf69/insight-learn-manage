// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { EXPORT_TABLES, EXPORT_VERSION, exportManifest } from '../../supabase/functions/sauvegarde-quotidienne-eleves/manifest';
function harness(initial: Record<string, any>, failManifest = false) {
  const objects = new Map<string, any>([['2026-10-17/_etat.json', initial]]);
  const events: string[] = []; const reads: string[] = [];
  const sb = {
    storage: { from: () => ({
      upload: async (path: string, blob: Blob) => {
        events.push(path);
        if (failManifest && path.endsWith('_termine.json')) return { error: { message: 'synthetic failure' } };
        objects.set(path, JSON.parse(await blob.text())); return { error: null };
      },
      download: async (path: string) => ({ data: objects.has(path) ? new Blob([JSON.stringify(objects.get(path))]) : null }),
      list: async () => ({ data: [] }), remove: async () => { throw new Error('No deletion in synthetic run'); },
    }) },
    from: (table: string) => {
      reads.push(table); const q: any = { select: () => q, order: (pk: string) => { events.push(`${table}:${pk}`); return q; }, range: async () => ({ data: [], error: null }), insert: async () => ({ error: null }) }; return q;
    },
  };
  let handler: (req: Request) => Promise<Response> = async () => new Response('', { status: 500 });
  const source = readFileSync('supabase/functions/sauvegarde-quotidienne-eleves/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('Deno', 'createClient', 'corsHeaders', 'EXPORT_TABLES', 'EXPORT_VERSION', 'exportManifest', js)(
    { env: { get: () => 'synthetic' }, serve: (fn: typeof handler) => { handler = fn; } }, () => sb, {}, EXPORT_TABLES, EXPORT_VERSION, exportManifest,
  );
  const call = () => handler(new Request('https://synthetic.test', { method: 'POST', body: JSON.stringify({ jour: '2026-10-17', saut: 39 }) }));
  return { call, objects, events, reads };
}
const counts = () => Object.fromEntries(EXPORT_TABLES.map(([name]) => [name, 0]));
describe('Actual nightly export with mocked storage', () => {
  it('keeps a completed 23-table export legacy, no new reads', async () => {
    const h = harness({ termine: true, comptes: Object.fromEntries(EXPORT_TABLES.slice(0, 23).map(([name]) => [name, 0])) });
    const body = await (await h.call()).json(); expect(body.tables).toBe(23); expect(body.version).toBe(1); expect(h.reads).toEqual([]);
  });
  it('resumes the appended pending-links table with its real primary key', async () => {
    const h = harness({ i: 25, from: 0, comptes: counts(), erreurs: [], maj: '2000-01-01', jour: '2026-10-17' });
    const body = await (await h.call()).json(); expect(body.ok).toBe(true); expect(body.tables).toBe(26);
    expect(h.events).toContain('cma_planning_attente_rattachements:id');
    expect(h.events.indexOf('2026-10-17/_termine.json')).toBeLessThan(h.events.lastIndexOf('2026-10-17/_etat.json'));
  });
  it('failed final manifest never commits a completed checkpoint', async () => {
    const h = harness({ i: 26, from: 0, comptes: counts(), erreurs: [], maj: '2000-01-01', jour: '2026-10-17' }, true);
    await expect(h.call()).rejects.toThrow('point de reprise');
    expect(h.objects.get('2026-10-17/_etat.json').termine).not.toBe(true);
  });
  it('missing counts report incomplete instead of success', async () => {
    const h = harness({ i: 26, from: 0, comptes: {}, erreurs: [], maj: '2000-01-01', jour: '2026-10-17' });
    const body = await (await h.call()).json(); expect(body.ok).toBe(false); expect(body.erreurs).toHaveLength(26);
    expect(h.objects.has('2026-10-17/_termine.json')).toBe(false);
  });
});