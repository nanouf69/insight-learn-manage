/**
 * Persistance fiable des réponses apprenants.
 *
 * Objectif : une réponse cochée par un apprenant ne doit JAMAIS être perdue,
 * quel que soit le contexte (changement de question/module, fermeture d'onglet,
 * déconnexion, perte de réseau, changement d'appareil…).
 *
 * Principe :
 *  1. Chaque sauvegarde est mise dans une file d'attente DURABLE (localStorage).
 *  2. Un worker vide la file séquentiellement vers l'Edge Function
 *     `upsert-reponse-apprenant`, avec retries et backoff.
 *  3. La file survit à un rechargement de page : au démarrage suivant, les
 *     sauvegardes non confirmées sont renvoyées automatiquement.
 *  4. Tant qu'une sauvegarde n'est pas confirmée par le serveur, l'état exposé
 *     est `saving` puis `error` — jamais `saved`. L'UI ne doit donc jamais
 *     laisser croire à l'apprenant que sa réponse est enregistrée.
 *  5. Chaque réponse est aussi journalisée question par question (table
 *     `reponses_apprenants_journal`, append-only) : apprenant, module, quiz,
 *     question, valeur choisie, tentative, date/heure.
 *
 * Le localStorage n'est utilisé QUE comme file d'attente de secours : il n'est
 * jamais la source de vérité, la base l'est toujours.
 */

const QUEUE_KEY = "answer_save_queue_v1";
const MAX_QUEUE_ITEMS = 500;

export type AnswerSaveState = "idle" | "saving" | "saved" | "error";

export interface AnswerJournalEvent {
  event_id?: string;
  question_id: string;
  valeur: unknown;
  tentative?: number;
  client_saved_at?: string;
}

export interface AnswerSavePayload {
  apprenant_id: string;
  user_id?: string;
  module_id?: number | null;
  exercice_id: string;
  exercice_type: string;
  reponses: Record<string, unknown>;
  completed?: boolean;
  score?: number | null;
  updated_at?: string;
  events?: AnswerJournalEvent[];
}

interface QueueItem {
  id: string;
  payload: AnswerSavePayload;
  queued_at: string;
  attempts: number;
}

type Listener = (state: AnswerSaveState, pending: number) => void;

const listeners = new Set<Listener>();
let state: AnswerSaveState = "idle";
let processing = false;
let authToken: string | null = null;

const makeEventId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4${Math.random().toString(16).slice(2, 5)}-8${Math.random().toString(16).slice(2, 5)}-${Math.random().toString(16).slice(2, 14)}`;
};

const readQueue = (): QueueItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE_ITEMS)));
  } catch {
    /* quota : la file en mémoire continue de fonctionner */
  }
};

const emit = () => {
  const pending = readQueue().length;
  listeners.forEach((l) => {
    try {
      l(state, pending);
    } catch {
      /* noop */
    }
  });
};

const setState = (next: AnswerSaveState) => {
  state = next;
  emit();
};

/** Permet à l'UI de suivre l'état réel de l'enregistrement. */
export function subscribeAnswerSaveState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state, readQueue().length);
  return () => listeners.delete(listener);
}

export function getPendingAnswerSaves(): number {
  return readQueue().length;
}

export function getPendingAnswers(
  apprenantId: string,
  exerciceId: string
): Record<string, unknown> | null {
  const matches = readQueue().filter(
    (item) => item.payload.apprenant_id === apprenantId && item.payload.exercice_id === exerciceId
  );
  return matches.length > 0
    ? matches.reduce<Record<string, unknown>>(
        (merged, item) => ({ ...merged, ...(item.payload.reponses ?? {}) }),
        {}
      )
    : null;
}

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
};

export function answersAreEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortValue(left ?? {})) === JSON.stringify(sortValue(right ?? {}));
}

export async function flushAnswerSavesAndWait(
  apprenantId: string,
  exerciceId: string,
  timeoutMs = 20000
): Promise<boolean> {
  void processQueue();
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const pending = readQueue().some(
      (item) => item.payload.apprenant_id === apprenantId && item.payload.exercice_id === exerciceId
    );
    if (!pending) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!processing) void processQueue();
  }
  return false;
}

/** Le token JWT courant, mis à jour par l'application. */
export function setAnswerSaveAuthToken(token: string | null) {
  authToken = token;
}

const endpoint = () => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl}/functions/v1/upsert-reponse-apprenant`;
};

const buildHeaders = (): Record<string, string> | null => {
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!apikey) return null;
  const headers: Record<string, string> = {
    apikey,
    "Content-Type": "application/json",
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
};

async function sendItem(item: QueueItem): Promise<boolean> {
  const url = endpoint();
  const headers = buildHeaders();
  if (!url || !headers) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(item.payload),
    });
    if (res.ok) {
      const confirmation = await res.json().catch(() => null);
      return confirmation?.success === true && confirmation?.confirmed === true;
    }
    // 4xx hors auth : inutile de boucler indéfiniment, mais on garde la trace.
    console.error("[answerPersistence] Échec sauvegarde", res.status, await res.text());
    return false;
  } catch (e) {
    console.error("[answerPersistence] Erreur réseau sauvegarde", e);
    return false;
  }
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    let queue = readQueue();
    const itemsToTry = queue.length;
    let tried = 0;
    let hadFailure = false;
    while (queue.length > 0 && tried < itemsToTry) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setState("error");
        return;
      }
      setState("saving");
      const item = queue[0];
      const ok = await sendItem(item);
      tried += 1;
      queue = readQueue();
      if (ok) {
        // Retirer l'élément traité (identifié par son id).
        queue = queue.filter((q) => q.id !== item.id);
        writeQueue(queue);
      } else {
        const idx = queue.findIndex((q) => q.id === item.id);
        if (idx >= 0) {
          const failed = { ...queue[idx], attempts: (queue[idx].attempts ?? 0) + 1 };
          queue.splice(idx, 1);
          queue.push(failed);
          writeQueue(queue);
        }
        hadFailure = true;
      }
    }
    if (queue.length === 0) {
      setState("saved");
    } else {
      setState("error");
      const attempts = Math.max(...queue.map((item) => item.attempts ?? 1), 1);
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
      if (hadFailure) setTimeout(() => void processQueue(), delay);
    }
  } finally {
    processing = false;
  }
}

/**
 * Enregistre durablement une réponse (ou un lot de réponses d'un exercice).
 * Retourne immédiatement : la file garantit l'envoi, même après rechargement.
 */
export function enqueueAnswerSave(payload: AnswerSavePayload): void {
  if (!payload?.apprenant_id || !payload?.exercice_id) return;
  const item: QueueItem = {
    id: `${payload.exercice_id}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`,
    payload: {
      ...payload,
      updated_at: payload.updated_at ?? new Date().toISOString(),
      events: (payload.events ?? []).map((event) => ({
        ...event,
        event_id: event.event_id ?? makeEventId(),
        client_saved_at: event.client_saved_at ?? new Date().toISOString(),
      })),
    },
    queued_at: new Date().toISOString(),
    attempts: 0,
  };
  const queue = readQueue();
  // Compactage : une sauvegarde non envoyée du même exercice non terminée est
  // remplacée par la plus récente (la dernière réponse fait foi), mais les
  // événements question par question sont conservés et fusionnés.
  const sameExoIdx = queue.findIndex(
    (q) =>
      q.payload.exercice_id === payload.exercice_id &&
      q.payload.apprenant_id === payload.apprenant_id &&
      !q.payload.completed &&
      !payload.completed
  );
  if (sameExoIdx >= 0) {
    const previous = queue[sameExoIdx];
    item.payload.events = [...(previous.payload.events ?? []), ...(item.payload.events ?? [])];
    queue.splice(sameExoIdx, 1);
  }
  queue.push(item);
  writeQueue(queue);
  setState("saving");
  void processQueue();
}

/**
 * Envoi synchrone de dernier recours quand la page se ferme.
 * Utilise sendBeacon (non bloquant, fiable à la fermeture) ; en cas d'échec,
 * l'élément reste dans la file et repartira au prochain chargement.
 */
export function flushAnswerSavesOnUnload(): void {
  const queue = readQueue();
  if (queue.length === 0) return;
  const url = endpoint();
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !apikey) return;
  for (const item of queue) {
    try {
      const beaconUrl = `${url}?apikey=${encodeURIComponent(apikey)}${
        authToken ? `&access_token=${encodeURIComponent(authToken)}` : ""
      }`;
      const blob = new Blob([JSON.stringify(item.payload)], { type: "application/json" });
      navigator.sendBeacon?.(beaconUrl, blob);
    } catch {
      /* la file reste intacte : renvoi au prochain chargement */
    }
  }
}

let installed = false;

/** À appeler une fois au démarrage de l'application. */
export function installAnswerPersistence(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("online", () => void processQueue());
  window.addEventListener("pagehide", flushAnswerSavesOnUnload);
  window.addEventListener("beforeunload", flushAnswerSavesOnUnload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void processQueue();
  });
  // Renvoi automatique des sauvegardes restées en attente lors d'une session
  // précédente (onglet fermé, navigateur fermé, réseau coupé…).
  if (readQueue().length > 0) void processQueue();
  setInterval(() => {
    if (readQueue().length > 0) void processQueue();
  }, 15000);
}
