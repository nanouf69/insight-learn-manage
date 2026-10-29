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
});
