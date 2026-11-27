import { describe, it, expect } from "vitest";
import { enqueueDraft, flushQueue, futureQueueKey, readQueue, assertFutureKey, type KV } from "@/lib/bilanFutureTransport";

const mem = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) };
};
const r = { passageId: "rec-1", versionId: "ver-1", moduleId: 11, exerciseId: 600, ownerId: "u1" };

describe("isolated Bilan transport", () => {
  it("never uses a legacy key", () => {
    expect(futureQueueKey(r)).toBe("bilan-future:v1:u1:rec-1:ver-1");
    expect(() => assertFutureKey("module_11_exo_600")).toThrow();
  });
  it("ignores legacy queue entries and other accounts/versions", () => {
    const kv = mem();
    kv.setItem("module_11_exo_600", JSON.stringify([{ questionId: 104, answer: ["C"] }]));
    kv.setItem(futureQueueKey(r), JSON.stringify([{ ...r, receiptId: "rec-1", versionId: "ver-OLD", ownerId: "u1", questionId: 104, revision: 1, answer: ["C"], token: "t" }]));
    expect(readQueue(kv, r)).toEqual([]);
  });
  it("removes item only after server ack; stale refusal reported, not retried", async () => {
    const kv = mem();
    enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["B"], token: "t1" });
    enqueueDraft(kv, r, { questionId: 114, revision: 1, answer: ["C"], token: "t2" });
    const calls: unknown[] = [];
    const res = await flushQueue(kv, r, async a => { calls.push(a); return a.p_question === 114 ? { error: { code: "P0493", message: "stale" } } : { error: null }; });
    expect(res.pending).toBe(0);
    expect(res.rejected.map(x => x.draft.questionId)).toEqual([114]);
    expect(calls.every((c: any) => c.p_receipt === "rec-1" && c.p_version === "ver-1")).toBe(true);
    expect(kv.m.has(futureQueueKey(r))).toBe(false);
  });
  it("keeps queue on transient error", async () => {
    const kv = mem();
    enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["B"], token: "t1" });
    const res = await flushQueue(kv, r, async () => ({ error: { message: "network" } }));
    expect(res.pending).toBe(1);
  });
  it("confirmation de 104 préserve 114 ajoutée pendant l'envoi et sa reprise après reload", async () => {
    const kv = mem();
    enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["B"], token: "t104" });
    let ack: ((value: { error: null }) => void) | undefined;
    const sent: number[] = [];
    const flushing = flushQueue(kv, r, args => {
      sent.push(args.p_question);
      return new Promise(resolve => { ack = resolve; });
    });
    enqueueDraft(kv, r, { questionId: 114, revision: 1, answer: ["C"], token: "t114" });
    ack?.({ error: null });
    expect((await flushing).pending).toBe(1);
    const reloaded = mem();
    reloaded.setItem(futureQueueKey(r), kv.getItem(futureQueueKey(r)) ?? "[]");
    expect(readQueue(reloaded, r)).toMatchObject([{ questionId: 114, answer: ["C"], token: "t114" }]);
    await flushQueue(reloaded, r, async args => { sent.push(args.p_question); return { error: null }; });
    expect(sent).toEqual([104, 114]);
    expect(readQueue(reloaded, r)).toEqual([]);
  });
  it.each([null, { code: "P0493", message: "refus" }, { message: "réseau" }])(
    "un accusé/refus de l'ancienne version ne supprime pas la nouvelle réponse (%j)", async error => {
      const kv = mem();
      enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["B"], token: "old" });
      await flushQueue(kv, r, async () => {
        enqueueDraft(kv, r, { questionId: 104, revision: 2, answer: ["D"], token: "new" });
        return { error };
      });
      expect(readQueue(kv, r)).toMatchObject([{ questionId: 104, revision: 2, answer: ["D"], token: "new" }]);
    },
  );
  it("même numéro de révision et token remplacé ne valent pas confirmation de la nouvelle valeur", async () => {
    const kv = mem();
    enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["B"], token: "old" });
    await flushQueue(kv, r, async () => {
      enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["D"], token: "new" });
      return { error: null };
    });
    expect(readQueue(kv, r)).toMatchObject([{ questionId: 104, answer: ["D"], token: "new" }]);
  });
  it("ne renvoie pas une ancienne réponse remplacée pendant l'envoi de la précédente", async () => {
    const kv = mem();
    enqueueDraft(kv, r, { questionId: 104, revision: 1, answer: ["B"], token: "104" });
    enqueueDraft(kv, r, { questionId: 114, revision: 1, answer: ["C"], token: "old114" });
    const sent: number[] = [];
    await flushQueue(kv, r, async args => {
      sent.push(args.p_question);
      enqueueDraft(kv, r, { questionId: 114, revision: 2, answer: ["D"], token: "new114" });
      return { error: null };
    });
    expect(sent).toEqual([104]);
    expect(readQueue(kv, r)).toMatchObject([{ questionId: 114, revision: 2, answer: ["D"], token: "new114" }]);
  });
});
