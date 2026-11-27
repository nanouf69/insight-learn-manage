import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }), signOut: vi.fn() }, from: vi.fn(), rpc: vi.fn() } }));
import { flushBrouillonsFormulaires, type DepsBrouillons } from "@/lib/brouillonsFormulaires";
import { flushToutesFilesAvantDeconnexion, sortieApprenantSecurisee, MESSAGE_FORMULAIRE_A_ROUVRIR, type DepsFlushDeconnexion } from "@/lib/flushAvantDeconnexion";

const kvDe = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), keys: () => [...m.keys()], m };
};
const entree = (d: object, meta = true) => JSON.stringify({ ...d, _pending: true, ...(meta ? { _autosave_meta: { titre: "T", moduleId: 3 } } : {}) });

describe("D3 — brouillons de formulaires avant déconnexion", () => {
  const base = (kv: ReturnType<typeof kvDe>, over: Partial<DepsBrouillons> = {}): DepsBrouillons => ({
    kv, montes: () => [],
    enregistrer: vi.fn(async () => ({ error: null })),
    relire: vi.fn(async () => ({ data: { donnees: { q: 1, b: [1, 2] } }, error: null })), ...over,
  });
  it("relecture serveur identique → confirmé, copie locale gardée en _pending:false, envoi sans marqueurs", async () => {
    const kv = kvDe({ autosave_pending_a1_satisfaction: entree({ b: [1, 2], q: 1 }) });
    const d = base(kv);
    const r = await flushBrouillonsFormulaires({ userId: "u1", apprenantId: "a1" }, d);
    expect(r.ok).toBe(true);
    expect((d.enregistrer as any).mock.calls[0][0]).toMatchObject({ titre: "T", moduleId: 3, donnees: { b: [1, 2], q: 1 }, userId: "u1" });
    expect((d.enregistrer as any).mock.calls[0][0].donnees._pending).toBeUndefined();
    expect(JSON.parse(kv.m.get("autosave_pending_a1_satisfaction")!)).toMatchObject({ q: 1, _pending: false });
  });
  it("échec d'écriture ou relecture différente → bloqué, brouillon intact", async () => {
    for (const over of [{ enregistrer: async () => ({ error: { code: "08006" } }) }, { relire: async () => ({ data: { donnees: { q: 9 } }, error: null }) }, { relire: async () => ({ data: null, error: { code: "500" } }) }]) {
      const v = entree({ q: 1, b: [1, 2] });
      const kv = kvDe({ autosave_pending_a1_x: v });
      const r = await flushBrouillonsFormulaires({ userId: "u1", apprenantId: "a1" }, base(kv, over as any));
      expect(r.ok).toBe(false);
      expect(kv.m.get("autosave_pending_a1_x")).toBe(v);
    }
  });
  it("ancien brouillon sans titre → à rouvrir, jamais envoyé ni effacé", async () => {
    const v = entree({ q: 1 }, false);
    const kv = kvDe({ autosave_pending_a1_x: v });
    const d = base(kv);
    const r = await flushBrouillonsFormulaires({ userId: "u1", apprenantId: "a1" }, d);
    expect(r).toMatchObject({ ok: false, aRouvrir: ["x"] });
    expect(d.enregistrer).not.toHaveBeenCalled();
    expect(kv.m.get("autosave_pending_a1_x")).toBe(v);
  });
  it("brouillon d'un autre dossier ignoré (ni envoyé, ni bloquant)", async () => {
    const v = entree({ q: 1 });
    const kv = kvDe({ autosave_pending_a2_x: v });
    const d = base(kv);
    expect((await flushBrouillonsFormulaires({ userId: "u1", apprenantId: "a1" }, d)).ok).toBe(true);
    expect(d.enregistrer).not.toHaveBeenCalled();
    expect(kv.m.get("autosave_pending_a2_x")).toBe(v);
  });
  it("formulaire affiché qui échoue → bloqué ; celui d'un autre dossier non appelé", async () => {
    const autre = vi.fn(async () => false);
    const r = await flushBrouillonsFormulaires({ userId: "u1", apprenantId: "a1" }, base(kvDe({}), {
      montes: () => [{ apprenantId: "a1", typeDocument: "x", flush: async () => false }, { apprenantId: "a2", typeDocument: "y", flush: autre }],
    }));
    expect(r.ok).toBe(false); expect(autre).not.toHaveBeenCalled();
  });
});

describe("D2/D3 — barrière commune", () => {
  const deps = (over: Partial<DepsFlushDeconnexion>): DepsFlushDeconnexion => ({
    flushReponses: async () => true, attemptsNoyau: () => [], attemptsDuCompte: async () => [], viderNoyau: async () => ({ restantes: 0 }),
    kv: { getItem: () => null, setItem: () => {}, removeItem: () => {}, keys: () => [] }, saveBilan: async () => ({ error: null }),
    flushNotes: async () => true, notesEnAttente: () => 0, ...over,
  });
  it("pages non confirmées du compte actif → refus ; appelé avec le seul compte actif", async () => {
    const pages = vi.fn(async () => false);
    const r = await flushToutesFilesAvantDeconnexion({ userId: "u1", apprenantId: "a1" }, deps({ flushPages: pages, flushFormulaires: async () => ({ ok: true, aRouvrir: [] }) }));
    expect(r.nonConfirmees).toEqual(["pages"]); expect(pages).toHaveBeenCalledWith("u1");
  });
  it("formulaire à rouvrir → message dédié, aucun signOut", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const r = await sortieApprenantSecurisee({ userId: "u1", apprenantId: "a1" }, {
      flush: (ctx) => flushToutesFilesAvantDeconnexion(ctx, deps({ flushPages: async () => true, flushFormulaires: async () => ({ ok: false, aRouvrir: ["x"] }) })), signOut,
    });
    expect(r).toEqual({ ok: false, message: MESSAGE_FORMULAIRE_A_ROUVRIR }); expect(signOut).not.toHaveBeenCalled();
  });
});

describe("D1 — sortie sûre partagée", () => {
  it("échec signOut (erreur ou exception) → jamais de succès", async () => {
    const flush = async () => ({ ok: true, nonConfirmees: [] });
    expect((await sortieApprenantSecurisee({ userId: "u", apprenantId: "a" }, { flush, signOut: async () => ({ error: { message: "x" } }) })).ok).toBe(false);
    expect((await sortieApprenantSecurisee({ userId: "u", apprenantId: "a" }, { flush, signOut: async () => { throw new Error("réseau"); } })).ok).toBe(false);
    expect((await sortieApprenantSecurisee({ userId: "u", apprenantId: "a" }, { flush, signOut: async () => ({ error: null }) })).ok).toBe(true);
  });
  it("le bouton « Non, ce n'est pas moi » passe par la sortie sûre et ne redirige qu'après succès", async () => {
    const src = (await import("node:fs")).readFileSync("src/components/cours-en-ligne/EmargementFCModal.tsx", "utf8");
    const bloc = src.slice(src.indexOf("disabled={sortieEnCours}"), src.indexOf("Non, ce n'est pas moi"));
    expect(bloc).toMatch(/sortieApprenantSecurisee/);
    expect(bloc).not.toMatch(/auth\.signOut/);
    expect(bloc.indexOf("return;")).toBeLessThan(bloc.indexOf('window.location.href = "/login"'));
  });
});
