// @vitest-environment node
// Conservation exacte U+0000 (22P05) : vrai handler upsert-reponse-apprenant (base simulée),
// vrai module de lecture, file client. Le contrat SQL réel est dans originaux_exacts_nul_contract.py.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { transformSync } from "esbuild";
import { describe, expect, it, vi } from "vitest";
import { statutEchecPersistance, traceSauvegarde } from "../../supabase/functions/upsert-reponse-apprenant/diagnostic";
import * as edgeOrig from "../../supabase/functions/upsert-reponse-apprenant/originauxExacts";
import * as O from "@/lib/originauxExacts";

const NUL_TXT = "a\u0000b ␀ littéral ␀\u034f é😀";
const EV = "33333333-3333-4333-8333-333333333333";

type Rpc = (name: string, args: Record<string, any>) => Promise<{ data: any; error: any }>;

function charger(rpcImpl: Rpc, journal: any[] = []) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const rpc = vi.fn(rpcImpl);
  const inCalls: any[] = [];
  const chain: any = {
    select: () => chain, eq: () => chain,
    in: async (_c: string, ids: string[]) => { inCalls.push(ids); return { data: journal.filter((j) => ids.includes(j.event_id)), error: null }; },
    maybeSingle: async () => ({ data: { id: "learner", auth_user_id: "owner" }, error: null }),
  };
  const source = readFileSync("supabase/functions/upsert-reponse-apprenant/index.ts", "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^/, "const createClient = globalThis.client; const corsHeaders = {}; const {statutEchecPersistance,traceSauvegarde} = globalThis.diagnostic; const {canonique,cleAvecNul,contientNul,lireOriginal,lireReponsesExactes,preparerLotSansNul} = globalThis.orig;\n");
  runInNewContext(transformSync(source, { loader: "ts", format: "cjs" }).code, {
    Request, Response, URL, crypto: webcrypto, console: { info() {}, warn() {}, error() {} },
    diagnostic: { statutEchecPersistance, traceSauvegarde }, orig: edgeOrig,
    client: () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) }, from: () => chain, rpc }),
    Deno: { env: { get: () => "fictitious" }, serve: (fn: typeof handler) => { handler = fn; } },
  });
  const appeler = async (reponses: Record<string, unknown>, events: unknown[] = []) => {
    const res = await handler!(new Request("https://fictitious.invalid", { method: "POST", headers: { Authorization: "Bearer x" }, body: JSON.stringify({ operation_id: "op_fictive", apprenant_id: "11111111-1111-4111-8111-111111111111", exercice_id: "EB1__fictif", exercice_type: "examen_blanc", reponses, events }) }));
    return { status: res.status, body: await res.json() };
  };
  return { appeler, rpc, inCalls };
}

/** Base simulée : applique v3 comme le SQL (seq, marqueur), pour tester le contrat ACK du handler. */
function baseSimulee(opts: { corrompre?: boolean } = {}) {
  const journal: any[] = [];
  const impl: Rpc = async (name, a) => {
    if (name === "persist_answer_batch_v2") return { data: [{ saved: true, stored_write_seq: 1, frozen: false, skipped_questions: [], accepted_event_ids: [] }], error: null };
    // Le corps envoyé à la base ne contient aucun U+0000.
    expect(JSON.stringify(a)).not.toContain("\\u0000");
    const orig: Record<string, any> = {};
    for (const [k, m] of Object.entries<any>(a.p_originaux)) orig[k] = { ...m, seq: 1, ...(opts.corrompre ? { b64: btoa("\"autre\"") } : {}) };
    for (const e of a.p_events) journal.push({ event_id: e.event_id, valeur: e.valeur, valeur_originale: e.valeur_originale ?? null });
    const meta = Object.fromEntries(Object.keys(a.p_reponses).map((k) => [k, { seq: 1 }]));
    return { data: [{ saved: true, stored_reponses: a.p_reponses, stored_originaux: orig, stored_meta: meta, stored_write_seq: 1, frozen: false, skipped_questions: [], accepted_event_ids: a.p_events.map((e: any) => e.event_id) }], error: null };
  };
  return { impl, journal };
}

describe("Conservation exacte U+0000", () => {
  it("copie edge identique au module client", () => {
    expect(readFileSync("supabase/functions/upsert-reponse-apprenant/originauxExacts.ts", "utf8")).toBe(readFileSync("src/lib/originauxExacts.ts", "utf8"));
  });

  it("projection : seul U+0000 est retiré ; U+2400 et U+034F littéraux inchangés", () => {
    expect(O.projeterSansNul(NUL_TXT)).toBe("ab ␀ littéral ␀\u034f é😀");
    expect(O.projeterSansNul("␀␀")).toBe("␀␀");
  });

  it("aller-retour exact aléatoire (NUL, ␀, U+034F, emoji, accents)", () => {
    const alpha = ["\u0000", "\u2400", "\u034F", "a", "é", "😀", "\"", "\\"];
    let r = 11;
    const n = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 2000; i++) {
      const s = Array.from({ length: Math.floor(n() * 14) }, () => alpha[Math.floor(n() * alpha.length)]).join("");
      const v = n() < 0.5 ? s : [s, { t: s }];
      const m = O.marqueurOriginal(v);
      expect(O.lireOriginal(m.projection, { ...m, seq: 4 }, 4)).toEqual({ statut: "exact", valeur: v });
    }
  });

  it("ancienne valeur sans marqueur jamais décodée ; version inconnue jamais décodée ; seq différente = périmé", () => {
    expect(O.lireOriginal("␀␀ ␀\u034f", null)).toEqual({ statut: "sans_marqueur", valeur: "␀␀ ␀\u034f" });
    const m = O.marqueurOriginal("x\u0000");
    expect(O.lireOriginal("x", { ...m, v: "nul-b64-v2", seq: 1 }, 1).statut).toBe("version_inconnue");
    expect(O.lireOriginal("x", { ...m, seq: 1 }, 2)).toEqual({ statut: "marqueur_perime", valeur: "x" });
    expect(O.lireOriginal("y", { ...m, seq: 1 }, 1)).toEqual({ statut: "marqueur_perime", valeur: "y" });
    expect(O.lireOriginal("x", { ...m, b64: "!!", seq: 1 }, 1).statut).toBe("marqueur_invalide");
  });

  it("lot sans U+0000 : chemin v2 strictement inchangé", async () => {
    const { appeler, rpc } = charger(baseSimulee().impl);
    const r = await appeler({ q1: "␀ littéral seul" });
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("persist_answer_batch_v2");
    expect(rpc.mock.calls[0][1].p_reponses).toEqual({ q1: "␀ littéral seul" });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_originaux");
  });

  it("lot avec U+0000 : v3, projection + original, ACK après relecture exacte réponse ET journal", async () => {
    const b = baseSimulee();
    const { appeler, rpc, inCalls } = charger(b.impl, b.journal);
    const r = await appeler({ q1: NUL_TXT, q2: "simple" }, [{ event_id: EV, question_id: "q1", valeur: NUL_TXT }]);
    expect(r.status).toBe(200);
    expect(r.body.confirmed).toBe(true);
    expect(r.body.original_exact_preserve).toEqual(["q1"]);
    expect(rpc.mock.calls[0][0]).toBe("persist_answer_batch_v3");
    expect(rpc.mock.calls[0][1].p_reponses).toEqual({ q1: O.projeterSansNul(NUL_TXT), q2: "simple" });
    expect(Object.keys(rpc.mock.calls[0][1].p_originaux)).toEqual(["q1"]);
    expect(inCalls).toEqual([[EV]]);
  });

  it("relecture divergente : aucune confirmation (500 ORIGINAL_NON_PROUVE)", async () => {
    const b = baseSimulee({ corrompre: true });
    const { appeler } = charger(b.impl, b.journal);
    const r = await appeler({ q1: NUL_TXT });
    expect(r.status).toBe(500);
    expect(r.body.code).toBe("ORIGINAL_NON_PROUVE");
    expect(r.body.confirmed).toBeUndefined();
  });

  it("événement accepté absent du journal relu : aucune confirmation", async () => {
    const b = baseSimulee();
    const { appeler } = charger(b.impl, []);
    const r = await appeler({ q1: NUL_TXT }, [{ event_id: EV, question_id: "q1", valeur: NUL_TXT }]);
    expect(r.status).toBe(500);
    expect(r.body.confirmed).toBeUndefined();
  });

  it("migration non appliquée : refus définitif 22P05 visible, puis plus aucun appel (pas de boucle)", async () => {
    const { appeler, rpc } = charger(async () => ({ data: null, error: { code: "PGRST202", message: "not found" } }));
    const r1 = await appeler({ q1: NUL_TXT });
    expect(r1.status).toBe(422);
    expect(r1.body.code).toBe("NUL_NON_SUPPORTE");
    expect(r1.body.error).toContain("22P05");
    const r2 = await appeler({ q1: NUL_TXT });
    expect(r2.status).toBe(422);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("identifiant de question contenant U+0000 : refus avant toute écriture", async () => {
    const { appeler, rpc } = charger(baseSimulee().impl);
    const r = await appeler({ "q\u00001": "x" });
    expect(r.status).toBe(422);
    expect(r.body.code).toBe("NUL_CLE_NON_SUPPORTEE");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("renvoi après perte de réponse : valeurs sautées restituées exactes au client", async () => {
    const m = { ...O.marqueurOriginal(NUL_TXT), seq: 1 };
    const { appeler } = charger(async () => ({ data: [{ saved: true, stored_reponses: { q1: m.projection }, stored_originaux: { q1: m }, stored_meta: { q1: { seq: 1 } }, stored_write_seq: 1, frozen: false, skipped_questions: ["q1"], accepted_event_ids: [] }], error: null }));
    const r = await appeler({ q1: NUL_TXT });
    expect(r.status).toBe(200);
    expect(r.body.stored_reponses).toEqual({ q1: NUL_TXT });
    expect(r.body.original_exact_preserve).toEqual([]);
  });
});
