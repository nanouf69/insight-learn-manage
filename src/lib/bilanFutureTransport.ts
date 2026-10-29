/**
 * Receipt-scoped transport for isolated future Bilan passages (modules 5/11).
 * Not imported by any learner screen yet. Never reads or writes legacy `module_X_exo_Y` keys,
 * so an old tab's queue can never be replayed against the new bank, and vice versa.
 */
import type { FutureReceipt } from "./bilanFutureVersion";

export const FUTURE_QUEUE_PREFIX = "bilan-future:v1:";

export type FutureDraft = {
  receiptId: string; versionId: string; ownerId: string;
  questionId: number; revision: number; answer: string[]; token: string;
};

export type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

export const futureQueueKey = (r: Pick<FutureReceipt, "ownerId" | "passageId" | "versionId">) =>
  `${FUTURE_QUEUE_PREFIX}${r.ownerId}:${r.passageId}:${r.versionId}`;

/** Legacy keys are refused outright: the isolated transport has no legacy fallback. */
export function assertFutureKey(key: string) {
  if (!key.startsWith(FUTURE_QUEUE_PREFIX) || /module_\d+_exo_\d+/.test(key)) throw new Error("Legacy key refused by isolated transport");
}

export function readQueue(kv: KV, r: FutureReceipt): FutureDraft[] {
  const key = futureQueueKey(r); assertFutureKey(key);
  let parsed: unknown;
  try { parsed = JSON.parse(kv.getItem(key) ?? "[]"); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  // Drop anything not belonging exactly to this account/receipt/version (e.g. copied storage).
  return parsed.filter((d: FutureDraft) => d && d.ownerId === r.ownerId && d.receiptId === r.passageId && d.versionId === r.versionId);
}

export function enqueueDraft(kv: KV, r: FutureReceipt, d: Omit<FutureDraft, "receiptId" | "versionId" | "ownerId">) {
  const key = futureQueueKey(r); assertFutureKey(key);
  const q = readQueue(kv, r).filter(x => !(x.questionId === d.questionId && x.revision <= d.revision));
  q.push({ ...d, receiptId: r.passageId, versionId: r.versionId, ownerId: r.ownerId });
  kv.setItem(key, JSON.stringify(q));
}

export type SaveRpc = (args: { p_receipt: string; p_version: string; p_question: number; p_revision: number; p_answer: string[]; p_token: string })
  => Promise<{ error: { code?: string; message: string } | null }>;

/** Flush: an item leaves the queue only after a server acknowledgement. Definitive refusals are reported, never retried. */
export async function flushQueue(kv: KV, r: FutureReceipt, save: SaveRpc) {
  const key = futureQueueKey(r);
  const rejected: { draft: FutureDraft; code: string }[] = [];
  let remaining = readQueue(kv, r);
  for (const d of [...remaining].sort((a, b) => a.revision - b.revision)) {
    const { error } = await save({ p_receipt: d.receiptId, p_version: d.versionId, p_question: d.questionId, p_revision: d.revision, p_answer: d.answer, p_token: d.token });
    if (!error) { remaining = remaining.filter(x => x !== d); continue; }
    if (["P0491", "P0492", "P0493", "42501", "22023"].includes(error.code ?? "")) {
      rejected.push({ draft: d, code: error.code! });
      remaining = remaining.filter(x => x !== d);
      continue;
    }
    break; // transient: keep order, retry later
  }
  if (remaining.length) kv.setItem(key, JSON.stringify(remaining)); else kv.removeItem(key);
  return { pending: remaining.length, rejected };
}
