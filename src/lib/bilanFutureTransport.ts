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
  /** Refus définitif reçu mais archive locale non confirmée : conservé, jamais renvoyé. */
  rejectedCode?: string;
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

export const FUTURE_REJECT_PREFIX = "bilan-future-rejets:v1:";
export const futureRejectKey = (r: Pick<FutureReceipt, "ownerId" | "passageId" | "versionId">) =>
  `${FUTURE_REJECT_PREFIX}${r.ownerId}:${r.passageId}:${r.versionId}`;
export type FutureRejected = FutureDraft & { code: string; rejectedAt: string };

/** Lecture des réponses refusées conservées pour ce compte/reçu/version (jamais renvoyées). */
const memeRejet = (x: FutureDraft, d: FutureDraft) => x.token === d.token && x.revision === d.revision &&
  x.questionId === d.questionId && JSON.stringify(x.answer) === JSON.stringify(d.answer);

/** Lecture des réponses refusées conservées pour ce compte/reçu/version (jamais renvoyées). null = archive illisible. */
function lireArchive(kv: KV, r: FutureReceipt): FutureRejected[] | null {
  try {
    const brut = kv.getItem(futureRejectKey(r));
    if (brut == null) return [];
    const v = JSON.parse(brut);
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}
export function readRejected(kv: KV, r: FutureReceipt): FutureRejected[] {
  return (lireArchive(kv, r) ?? []).filter((d: FutureRejected) => d && d.ownerId === r.ownerId && d.receiptId === r.passageId && d.versionId === r.versionId);
}

/** true seulement si la relecture prouve l'entrée exacte (réponse comprise). Archive corrompue = jamais écrasée. */
function archiverRejet(kv: KV, r: FutureReceipt, d: FutureDraft, code: string): boolean {
  try {
    const liste = lireArchive(kv, r);
    if (liste === null) return false;
    if (!liste.some((x) => x && memeRejet(x, d))) {
      const { rejectedCode: _ignore, ...propre } = d;
      liste.push({ ...propre, code, rejectedAt: new Date().toISOString() });
      kv.setItem(futureRejectKey(r), JSON.stringify(liste));
    }
    return readRejected(kv, r).some((x) => memeRejet(x, d));
  } catch { return false; }
}

export type SaveRpc = (args: { p_receipt: string; p_version: string; p_question: number; p_revision: number; p_answer: string[]; p_token: string })
  => Promise<{ error: { code?: string; message: string } | null }>;

/** Flush: an item leaves the queue only after a server acknowledgement. Definitive refusals are reported, never retried. */
export async function flushQueue(kv: KV, r: FutureReceipt, save: SaveRpc) {
  const key = futureQueueKey(r);
  const rejected: { draft: FutureDraft; code: string }[] = [];
  const sentSnapshot = readQueue(kv, r);
  for (const d of [...sentSnapshot].sort((a, b) => a.revision - b.revision)) {
    const sameOperation = (x: FutureDraft) => x.questionId === d.questionId &&
      x.revision === d.revision && x.token === d.token &&
      JSON.stringify(x.answer) === JSON.stringify(d.answer);
    // A later snapshot item may have been replaced while an earlier one was sent.
    if (!readQueue(kv, r).some(sameOperation)) continue;
    if (d.rejectedCode) {
      // Déjà refusé : on retente seulement l'archivage local, jamais l'envoi.
      if (!archiverRejet(kv, r, d, d.rejectedCode)) continue;
      const restant = readQueue(kv, r).filter(x => !sameOperation(x));
      if (restant.length) kv.setItem(key, JSON.stringify(restant)); else kv.removeItem(key);
      continue;
    }
    const { error } = await save({ p_receipt: d.receiptId, p_version: d.versionId, p_question: d.questionId, p_revision: d.revision, p_answer: d.answer, p_token: d.token });
    const code = error?.code ?? "";
    if (error && !["P0491", "P0492", "P0493", "42501", "22023"].includes(code)) {
      break; // transient: leave the current queue untouched, retry later
    }
    if (error) {
      rejected.push({ draft: d, code });
      // Refus définitif : la réponse quitte la file d'envoi (jamais rejouée) mais
      // reste conservée localement, intacte, pour relecture/récupération.
      if (!archiverRejet(kv, r, d, code)) {
        // Archivage impossible : la réponse reste en file (logout bloqué), marquée pour ne jamais être renvoyée.
        try { kv.setItem(key, JSON.stringify(readQueue(kv, r).map(x => sameOperation(x) ? { ...x, rejectedCode: code } : x))); } catch { /* file inchangée */ }
        break;
      }
    }
    // No await between rereading and updating: acknowledge only the exact sent
    // operation, never a newer answer/revision added while save was in flight.
    const current = readQueue(kv, r).filter(x => !sameOperation(x));
    if (current.length) kv.setItem(key, JSON.stringify(current)); else kv.removeItem(key);
  }
  return { pending: readQueue(kv, r).length, rejected };
}
