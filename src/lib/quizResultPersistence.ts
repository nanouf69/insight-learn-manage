/**
 * Persistance fiable des NOTES de matière (`apprenant_quiz_results`).
 *
 * Objectif : une note calculée ne doit jamais disparaître parce que le réseau
 * ou la session a échoué au moment de l'enregistrement. Elle est mise dans une
 * file DURABLE (localStorage) et renvoyée automatiquement jusqu'à confirmation
 * par la base.
 *
 * Postes partagés : chaque élément mémorise le compte authentifié propriétaire.
 * Un élément laissé par l'apprenant A n'est JAMAIS envoyé sous le compte de
 * l'apprenant B — il reste simplement en attente du retour de son propriétaire.
 * Rien n'est jamais supprimé silencieusement.
 */
import { blockLearnerWrite, isLearnerPreviewReadOnly } from "@/lib/learnerPreviewGuard";
import { supabase } from "@/integrations/supabase/client";

const QUEUE_KEY = "quiz_result_save_queue_v1";

export interface QuizResultPayload {
  apprenant_id: string;
  user_id: string;
  quiz_type: string;
  quiz_id: string;
  quiz_titre: string;
  matiere_id: string;
  matiere_nom: string;
  score_obtenu: number;
  score_max: number;
  note_sur_20: number;
  reussi: boolean;
  duree_secondes?: number;
  details: Record<string, unknown>;
  tentative: number;
}

interface QueueItem {
  id: string;
  payload: QuizResultPayload;
  queued_at: string;
  attempts: number;
  owner_user_id: string | null;
  /** Comptes auxquels la base a refusé cet élément : plus retenté par eux. */
  refused_user_ids?: string[];
}

const makeId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

const readQueue = (): QueueItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* quota : on ne supprime jamais une note, la file mémoire poursuit */
  }
};

const itemKey = (p: QuizResultPayload) =>
  `${p.apprenant_id}|${p.quiz_id}|${p.matiere_id}|${p.tentative}`;

const isOwnedByCurrentUser = (item: QueueItem, currentUserId: string | null): boolean => {
  if (!currentUserId) return false;
  if (item.owner_user_id) return item.owner_user_id === currentUserId;
  return !(item.refused_user_ids ?? []).includes(currentUserId);
};

let processing = false;

/** Met une note en file durable (dernière valeur gagnante pour la même clé). */
export function enqueueQuizResultSave(payload: QuizResultPayload) {
  if (blockLearnerWrite("enqueue_quiz_result")) return;
  const queue = readQueue().filter((it) => itemKey(it.payload) !== itemKey(payload));
  queue.push({
    id: makeId(),
    payload,
    queued_at: new Date().toISOString(),
    attempts: 0,
    owner_user_id: payload.user_id ?? null,
  });
  writeQueue(queue);
  void flushQuizResultSaves();
}

export function getPendingQuizResultCount(): number {
  return readQueue().length;
}

/** Tente d'envoyer les notes en attente appartenant au compte connecté. */
export async function flushQuizResultSaves(): Promise<boolean> {
  // Une consultation admin ne synchronise aucune ancienne note en attente.
  if (isLearnerPreviewReadOnly()) return true;
  if (processing) return false;
  const initial = readQueue();
  if (initial.length === 0) return true;
  processing = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id ?? null;
    if (!currentUserId) return false;

    let allSent = true;
    for (const item of initial) {
      if (!isOwnedByCurrentUser(item, currentUserId)) {
        allSent = false;
        continue;
      }
      const { error } = await supabase
        .from("apprenant_quiz_results" as any)
        .upsert([item.payload] as any, { onConflict: "apprenant_id,quiz_id,matiere_id,tentative" } as any);

      const queue = readQueue();
      const idx = queue.findIndex((q) => q.id === item.id);
      if (idx < 0) continue;

      if (!error) {
        queue.splice(idx, 1);
        writeQueue(queue);
        continue;
      }

      allSent = false;
      queue[idx].attempts = (queue[idx].attempts ?? 0) + 1;
      // Refus de droits (RLS) : conservé, mais plus retenté par ce compte.
      if ((error as any)?.code === "42501" || /row-level security/i.test(error.message || "")) {
        const refused = new Set(queue[idx].refused_user_ids ?? []);
        refused.add(currentUserId);
        queue[idx].refused_user_ids = Array.from(refused);
      }
      writeQueue(queue);
      console.error("[QuizResultQueue] Échec d'enregistrement, note conservée en attente:", error.message);
    }
    return allSent;
  } finally {
    processing = false;
  }
}

/** Démarre la reprise automatique (au chargement, au retour du réseau). */
export function initQuizResultPersistence() {
  if (typeof window === "undefined") return;
  void flushQuizResultSaves();
  window.addEventListener("online", () => { void flushQuizResultSaves(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushQuizResultSaves();
  });
  setInterval(() => { void flushQuizResultSaves(); }, 30_000);
}
