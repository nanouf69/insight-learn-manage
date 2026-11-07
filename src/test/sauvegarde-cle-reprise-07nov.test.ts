// @vitest-environment node
// Sauvegarde nocturne 07/11 : arrêt sur reponses_apprenants_journal@928000, reprises
// « déjà terminé » sans réparation. Contrats testés sur un stockage et des tables FICTIFS
// en mémoire (aucune connexion réelle) avec le VRAI code de la fonction.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { EXPORT_TABLES, EXPORT_VERSION, exportManifest } from '../../supabase/functions/sauvegarde-quotidienne-eleves/manifest';

const JOUR = '2026-11-07';
const JOURNAL = 'reponses_apprenants_journal';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type Echec = (ctx: { table: string; kind: 'count' | 'read'; gt: unknown; offset?: number }) => any | null;

function harness(opts: { rows?: Record<string, any[]>; echec?: Echec; etat?: any; objects?: Map<string, any> } = {}) {
  const objects = opts.objects ?? new Map<string, any>();
  if (opts.etat) objects.set(`${JOUR}/_etat.json`, opts.etat);
  const rows: Record<string, any[]> = opts.rows ?? {};
  const deleted: string[] = [];
  const alerts: any[] = [];
  const sb = {
    storage: { from: () => ({
      upload: async (path: string, blob: Blob) => { const txt = await blob.text(); let v: any = txt; try { v = JSON.parse(txt); } catch { /* texte */ } objects.set(path, v); return { error: null }; },
      download: async (path: string) => ({ data: objects.has(path) ? new Blob([JSON.stringify(objects.get(path))]) : null }),
      list: async () => ({ data: [] }),
      remove: async (p: string[]) => { deleted.push(...p); return { error: null }; },
    }) },
    from: (table: string) => {
      if (table === 'alertes_systeme') return { insert: (a: any) => { alerts.push(a); return Promise.resolve({ error: null }); } };
      const pk = EXPORT_TABLES.find(([n]) => n === table)![1];
      const data = () => [...(rows[table] ?? [])].sort((a, b) => (String(a[pk]) < String(b[pk]) ? -1 : 1));
      const st: any = { gt: null as unknown, head: false };
      const q: any = {
        select: (_c: string, o?: any) => { st.head = !!o?.head; return q; },
        order: () => q,
        gt: (_k: string, v: unknown) => { st.gt = v; return q; },
        limit: async (n: number) => {
          const e = opts.echec?.({ table, kind: 'read', gt: st.gt }); if (e) return { data: null, error: e };
          return { data: data().filter((r) => st.gt === null || String(r[pk]) > String(st.gt)).slice(0, n), error: null };
        },
        range: async (a: number, b: number) => {
          const e = opts.echec?.({ table, kind: 'read', gt: null, offset: a }); if (e) return { data: null, error: e };
          return { data: data().slice(a, b + 1), error: null };
        },
        then: (res: any, rej: any) => {
          const e = st.head ? opts.echec?.({ table, kind: 'count', gt: null }) : null;
          return Promise.resolve(e ? { count: null, error: e } : { count: (rows[table] ?? []).length, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
  let handler: (req: Request) => Promise<Response> = async () => new Response('', { status: 500 });
  const source = readFileSync('supabase/functions/sauvegarde-quotidienne-eleves/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const chained: any[] = [];
  const EdgeRuntime = { waitUntil: (p: Promise<unknown>) => { chained.push(p); } };
  const g: any = globalThis; const fetchAvant = g.fetch; g.fetch = async () => new Response('{}');
  new Function('Deno', 'createClient', 'corsHeaders', 'EXPORT_TABLES', 'EXPORT_VERSION', 'exportManifest', 'EdgeRuntime', 'setTimeout', js)(
    { env: { get: () => 'synthetic' }, serve: (fn: typeof handler) => { handler = fn; } }, () => sb, {}, EXPORT_TABLES, EXPORT_VERSION, exportManifest, EdgeRuntime, (f: () => void) => f(),
  );
  g.fetch = fetchAvant;
  const call = async (body: Record<string, unknown> = {}) => (await handler(new Request('https://synthetic.test', { method: 'POST', body: JSON.stringify({ jour: JOUR, chaine: true, saut: 0, ...body }) }))).json();
  /** Enchaîne les appels comme la chaîne + la reprise jusqu'à l'arrêt. */
  const run = async (body: Record<string, unknown> = {}, max = 5000) => {
    let last: any;
    for (let n = 0; n < max; n++) { last = await call(body); if (!last.en_cours) return last; }
    throw new Error('non terminé');
  };
  const parts = (prefix: string) => [...objects.entries()].filter(([k]) => k.startsWith(prefix) && /\/part-\d+\.json$/.test(k)).sort(([a], [b]) => (a < b ? -1 : 1)).flatMap(([, v]) => v);
  return { call, run, objects, deleted, alerts, parts };
}

function jeuFictif(nJournal: number) {
  const rows: Record<string, any[]> = {};
  for (const [t, pk] of EXPORT_TABLES) rows[t] = [{ [pk]: t === 'answer_events' || t === 'qrc_correction_events' ? 1 : uuid(1) }];
  rows[JOURNAL] = Array.from({ length: nJournal }, (_, i) => ({ id: uuid(i + 1), valeur: `r${i}` }));
  return rows;
}

describe('Sauvegarde nocturne : lecture par clé, reprise et preuve de fin (07/11)', () => {
  it('erreur de page temporaire (57014) : même paquet réessayé, ni trou ni doublon, _termine.json prouvé', async () => {
    const rows = jeuFictif(4500);
    let pannes = 2;
    const h = harness({ rows, echec: ({ table, kind, gt }) => (table === JOURNAL && kind === 'read' && gt === uuid(2000) && pannes-- > 0 ? { code: '57014', message: 'canceling statement due to statement timeout' } : null) });
    const fin = await h.run();
    expect(fin.ok).toBe(true);
    const ids = h.parts(`${JOUR}/${JOURNAL}/`).map((r: any) => r.id);
    expect(ids).toHaveLength(4500);
    expect(new Set(ids).size).toBe(4500);
    expect(ids).toEqual(rows[JOURNAL].map((r) => r.id));
    expect(h.objects.has(`${JOUR}/_termine.json`)).toBe(true);
    expect(h.objects.has(`${JOUR}/_incomplet.json`)).toBe(false);
    expect(h.objects.get(`${JOUR}/_termine.json`).preuves[JOURNAL]).toMatchObject({ debut: 4500, fin: 4500, mode: 'cle' });
    expect(h.objects.get(`${JOUR}/_erreurs/${JOURNAL}-2000.txt`)).toContain('57014');
    expect(h.deleted).toEqual([]);
  });

  it('panne persistante : abandon après 3 échecs, _incomplet.json + alerte, jamais _termine.json', async () => {
    const h = harness({ rows: jeuFictif(3000), echec: ({ table, kind, gt }) => (table === JOURNAL && kind === 'read' && gt === uuid(2000) ? { code: '57014', message: 'timeout' } : null) });
    const fin = await h.run();
    expect(fin.ok).toBe(false);
    expect(h.objects.has(`${JOUR}/_termine.json`)).toBe(false);
    const inc = h.objects.get(`${JOUR}/_incomplet.json`);
    expect(inc.erreurs.join(' ')).toMatch(/reponses_apprenants_journal@2000: 3 échecs/);
    expect(h.alerts).toHaveLength(1);
  });

  it('reprise programmée sur journée incomplète : ne répare rien seule et ne ment pas (plus de « déjà terminé »)', async () => {
    const h = harness({ rows: jeuFictif(3000), echec: ({ table, gt }) => (table === JOURNAL && gt === uuid(2000) ? { code: '57014', message: 't' } : null) });
    await h.run();
    const reprise = await h.call({ reprise: true, chaine: false });
    expect(reprise.ok).toBe(false);
    expect(reprise.incomplet).toBe(true);
    expect(reprise.deja_termine).toBeUndefined();
  });

  it('réparation explicite : table en erreur réexportée entière à part, preuve, _incomplet conservé, idempotente', async () => {
    const rows = jeuFictif(3000);
    let panne = true;
    const objects = new Map<string, any>();
    const h1 = harness({ rows, objects, echec: ({ table, gt }) => (panne && table === JOURNAL && gt === uuid(2000) ? { code: '57014', message: 't' } : null) });
    await h1.run();
    const incomplet = JSON.stringify(objects.get(`${JOUR}/_incomplet.json`));
    const avant = new Map(objects);
    panne = false;
    const fin = await h1.run({ reparer: true });
    expect(fin.ok).toBe(true);
    expect(fin.repare).toBe(true);
    const ids = h1.parts(`${JOUR}/_reparation-1/${JOURNAL}/`).map((r: any) => r.id);
    expect(ids).toEqual(rows[JOURNAL].map((r) => r.id));
    const termine = objects.get(`${JOUR}/_termine.json`);
    expect(termine.repare).toBe(true);
    expect(termine.sources[JOURNAL]).toBe(`_reparation-1/${JOURNAL}`);
    expect(termine.comptes[JOURNAL]).toBe(3000);
    expect(JSON.stringify(objects.get(`${JOUR}/_incomplet.json`))).toBe(incomplet);
    // Aucun fichier existant réécrit ou retiré (sauf l'état d'avancement).
    for (const [k, v] of avant) if (!k.endsWith('_etat.json')) expect(JSON.stringify(objects.get(k))).toBe(JSON.stringify(v));
    const encore = await h1.call({ reparer: true });
    expect(encore.deja_repare).toBe(true);
  });

  it('lignes ajoutées pendant l’export : aucune ligne du début manquante, aucun doublon', async () => {
    const rows = jeuFictif(2500);
    let ajout = false;
    const h = harness({ rows, echec: ({ table, gt }) => {
      if (table === JOURNAL && gt === uuid(2000) && !ajout) { ajout = true; rows[JOURNAL].push({ id: uuid(9999), valeur: 'tardive' }, { id: uuid(1500).replace(/1500$/, '1500') + '', valeur: 'x' }); }
      return null;
    } });
    const fin = await h.run();
    const ids = h.parts(`${JOUR}/${JOURNAL}/`).map((r: any) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i <= 2500; i++) expect(ids).toContain(uuid(i));
    expect(fin.ok).toBe(true);
  });

  it('export déjà complet : aucune nouvelle lecture', async () => {
    const h = harness({ rows: jeuFictif(10), etat: { termine: true, erreurs: [], comptes: {}, table_names: ['a'] } });
    const r = await h.call({ reprise: true });
    expect(r.deja_termine).toBe(true);
  });
});
