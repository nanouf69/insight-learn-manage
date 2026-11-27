import { describe, it, expect, vi } from "vitest";
import { flushQueue, enqueueDraft, readQueue, readRejected, futureRejectKey } from "@/lib/bilanFutureTransport";

const r: any = { ownerId: "u1", passageId: "p1", versionId: "v1" };
const kv = (failReject = false) => { const m = new Map<string, string>(); return { m,
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => { if (failReject && k === futureRejectKey(r)) throw new Error("quota"); m.set(k, v); },
  removeItem: (k: string) => { m.delete(k); } }; };

describe("archives des réponses Bilan refusées", () => {
  it("quota plein : réponse gardée en file, jamais renvoyée", async () => {
    const s = kv(true); enqueueDraft(s, r, { questionId: 1, revision: 1, answer: ["A"], token: "t" });
    const save = vi.fn(async () => ({ error: { code: "P0491", message: "x" } }));
    await flushQueue(s, r, save); await flushQueue(s, r, save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(readQueue(s, r)[0].answer).toEqual(["A"]);
    expect(readRejected(s, r)).toEqual([]);
  });
  it("archive corrompue jamais écrasée ni déclarée archivée", async () => {
    const s = kv(); s.m.set(futureRejectKey(r), "{corrompu");
    enqueueDraft(s, r, { questionId: 1, revision: 1, answer: ["A"], token: "t" });
    await flushQueue(s, r, async () => ({ error: { code: "P0491", message: "x" } }));
    expect(s.m.get(futureRejectKey(r))).toBe("{corrompu");
    expect(readQueue(s, r)).toHaveLength(1);
  });
  it("même identité mais réponse différente déjà archivée : nouvelle réponse aussi archivée", async () => {
    const s = kv(); s.m.set(futureRejectKey(r), JSON.stringify([{ ownerId: "u1", receiptId: "p1", versionId: "v1", questionId: 1, revision: 1, token: "t", answer: ["B"], code: "P0491", rejectedAt: "x" }]));
    enqueueDraft(s, r, { questionId: 1, revision: 1, answer: ["A"], token: "t" });
    await flushQueue(s, r, async () => ({ error: { code: "P0491", message: "x" } }));
    expect(readRejected(s, r).map(x => x.answer)).toEqual([["B"], ["A"]]);
    expect(readQueue(s, r)).toHaveLength(0);
  });
});

describe("dates d'attestation", () => {
  it("jalons illisibles : erreur, pas d'ancien calcul", async () => {
    vi.resetModules();
    const chain: any = new Proxy({}, { get: (_t, k) => k === "then" ? undefined : k === "single" ? async () => ({ data: { auth_user_id: "u", type_apprenant: "vtc-e", formation_choisie: "vtc-e" }, error: null }) : k === "limit" ? async () => ({ data: [{ mis_fin_formation: false }], error: null }) : () => chain });
    vi.doMock("@/integrations/supabase/client", () => ({ supabase: { from: () => chain } }));
    vi.doMock("@/lib/supabase/fetch-all-rows", () => ({ fetchAllRows: async () => [] }));
    vi.doMock("@/lib/jalonsPedagogiques", () => ({ formationJalonsElearning: () => true, chargerCalculJalons: async () => { throw new Error("sync"); } }));
    vi.doMock("@/lib/releveJalonsGel", () => ({ chargerEtatGel: async () => ({ etat: "vivant" }) }));
    const { chargerDatesPedagogiquesAttestation } = await import("@/lib/chargerDatesPedagogiquesAttestation");
    await expect(chargerDatesPedagogiquesAttestation("a")).rejects.toThrow(/non synchronisé/);
  });
});
