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
/**
 * Dernier numéro d'écriture SERVEUR connu, par (apprenant, exercice).
 * C'est le serveur — jamais l'horloge de l'appareil — qui décide de l'ordre des
 * écritures : une réponse composée hors connexion emporte le numéro qu'elle
 * connaissait, et le serveur refuse de lui laisser écraser une réponse plus
 * récente enregistrée entre-temps (autre onglet, autre appareil).
 */
import { setLearnerPreviewReadOnly, isLearnerPreviewReadOnly } from "@/lib/learnerPreviewGuard";

const SEQ_KEY = "answer_write_seq_v1";

const seqKeyFor = (apprenantId: string, exerciceId: string) => `${apprenantId}__${exerciceId}`;

function readSeqMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function getKnownWriteSeq(apprenantId: string, exerciceId: string): number {
  const value = readSeqMap()[seqKeyFor(apprenantId, exerciceId)];
  return Number.isFinite(value) ? Number(value) : 0;
}

function rememberWriteSeq(apprenantId: string, exerciceId: string, seq: number): void {
  if (!Number.isFinite(seq)) return;
  try {
    const map = readSeqMap();
    const key = seqKeyFor(apprenantId, exerciceId);
    if ((map[key] ?? 0) >= seq) return;
    map[key] = seq;
    localStorage.setItem(SEQ_KEY, JSON.stringify(map));
  } catch {
    /* le serveur reste de toute façon l'arbitre : au pire, base_seq reste bas */
  }
}
// POINT 7 — AUCUNE suppression silencieuse : il n'existe plus de plafond du
// nombre de réponses en attente. Si le stockage du navigateur sature, la file
// bascule en mémoire et une alerte est remontée : rien n'est jamais effacé
// pour faire de la place. Une réponse ne quitte la file qu'après confirmation
// d'enregistrement par le serveur.

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
  /**
   * Nombre total de questions actives du module. Permet au serveur de forcer
   * la validation du module dès que toutes les réponses sont enregistrées.
   */
  module_total_questions?: number | null;
  exercice_id: string;
  exercice_type: string;
  reponses: Record<string, unknown>;
  completed?: boolean;
  score?: number | null;
  updated_at?: string;
  /** Dernier numéro d'écriture serveur connu au moment de la saisie. */
  base_seq?: number;
  events?: AnswerJournalEvent[];
}

interface QueueItem {
  id: string;
  payload: AnswerSavePayload;
  queued_at: string;
  attempts: number;
  /**
   * Compte authentifié propriétaire de la sauvegarde au moment de la mise en
   * file. La file vit dans le localStorage du NAVIGATEUR : sur un poste
   * partagé, un élément laissé par l'apprenant A ne doit jamais être renvoyé
   * avec le jeton de l'apprenant B (ni d'un admin) — le serveur répondrait
   * 403 auth_user_id_mismatch en boucle. L'élément est simplement mis de côté
   * jusqu'au retour de son propriétaire : rien n'est supprimé.
   */
  owner_user_id?: string | null;
  /** Refusé par le serveur (403) : conservé, mais plus renvoyé en boucle. */
  blocked?: boolean;
  /**
   * Comptes auxquels le serveur a déjà refusé cet élément (403). Utile pour les
   * éléments anciens, mis en file avant l'enregistrement du propriétaire : sur
   * une tablette partagée, ils ne sont plus retentés en boucle par chaque
   * apprenant successif (ils restent en file pour leur propriétaire).
   */
  refused_user_ids?: string[];
}

type Listener = (state: AnswerSaveState, pending: number) => void;

const listeners = new Set<Listener>();
let state: AnswerSaveState = "idle";
let processing = false;
let authToken: string | null = null;
let authUserId: string | null = null;

/**
 * Dossier apprenant réellement rattaché à la session en cours.
 * `previewReadOnly` = écran de consultation (aperçu admin/formateur de la vue
 * d'un apprenant) : AUCUNE réponse ne doit y être mise en file, car elle
 * appartiendrait au compte consulté et non au compte connecté (le serveur la
 * refuserait avec 403 auth_user_id_mismatch, en boucle).
 */
let sessionApprenantId: string | null = null;
let previewReadOnly = false;
// Le worker global démarre avant que la page sache si elle représente un vrai
// apprenant ou un aperçu admin. Il reste donc suspendu tant que ce contexte
// n'est pas explicitement établi. Cela empêche notamment le renvoi au montage
// d'une ancienne ligne créée par erreur en Vue apprenant.
let ownershipContextReady = false;

export function setAnswerSaveOwnership(options: {
  apprenantId?: string | null;
  previewReadOnly?: boolean;
}): void {
  sessionApprenantId = options.apprenantId ?? null;
  previewReadOnly = options.previewReadOnly === true;
  ownershipContextReady = previewReadOnly || sessionApprenantId !== null;
  // Verrou central partagé par toutes les écritures « Vue apprenant ».
  setLearnerPreviewReadOnly(previewReadOnly);
  // Une fois le véritable dossier de la session apprenant identifié, ses
  // réponses en attente peuvent repartir. Un aperçu ne déclenche jamais cela.
  if (ownershipContextReady && !previewReadOnly && authToken) void processQueue();
}

/** Cette sauvegarde peut-elle légitimement partir sous la session en cours ? */
export function canQueueAnswerSaveFor(apprenantId: string): boolean {
  if (previewReadOnly || isLearnerPreviewReadOnly()) return false;
  // Sécurité fermée par défaut : aucune file n'est créée tant que le dossier
  // réellement lié à la session n'a pas été identifié.
  if (!ownershipContextReady || !sessionApprenantId) return false;
  return sessionApprenantId === apprenantId;
}

/** Le worker peut-il envoyer des réponses dans le contexte courant ? */
const canSynchronizeAnswers = (): boolean =>
  ownershipContextReady &&
  !previewReadOnly &&
  !isLearnerPreviewReadOnly() &&
  !!sessionApprenantId;

const isSendableInCurrentContext = (item: QueueItem): boolean =>
  canSynchronizeAnswers() &&
  item.payload.apprenant_id === sessionApprenantId &&
  isOwnedByCurrentUser(item) &&
  !item.blocked;

/**
 * Un élément appartient au compte actuellement connecté (ou provient d'une
 * version antérieure sans propriétaire enregistré : on le renvoie alors comme
 * avant). Les éléments d'un AUTRE compte sont conservés, jamais envoyés.
 */
const isOwnedByCurrentUser = (item: QueueItem): boolean => {
  if (item.owner_user_id) return !authUserId || item.owner_user_id === authUserId;
  // Élément sans propriétaire connu (ancienne version) : envoyable, sauf par un
  // compte auquel le serveur l'a déjà refusé.
  return !authUserId || !(item.refused_user_ids ?? []).includes(authUserId);
};

/**
 * Éléments réellement en attente d'envoi pour la session en cours.
 * Les éléments refusés (403) sont CONSERVÉS en file mais ne comptent plus
 * comme « en attente » : sinon l'indicateur resterait bloqué en erreur alors
 * que les nouvelles réponses s'enregistrent normalement.
 */
const isActivelyPending = (item: QueueItem): boolean =>
  isOwnedByCurrentUser(item) && !item.blocked;


const makeEventId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4${Math.random().toString(16).slice(2, 5)}-8${Math.random().toString(16).slice(2, 5)}-${Math.random().toString(16).slice(2, 14)}`;
};

/**
 * Miroir mémoire, utilisé UNIQUEMENT si le localStorage refuse d'écrire
 * (stockage saturé). Il garantit qu'aucune réponse en attente n'est perdue
 * pendant la session en cours, sans jamais supprimer d'élément.
 */
let memoryQueue: QueueItem[] | null = null;
let storageSaturated = false;
const saturationListeners = new Set<(saturated: boolean, pending: number) => void>();

const emitSaturation = (pending: number) => {
  saturationListeners.forEach((l) => {
    try {
      l(storageSaturated, pending);
    } catch {
      /* noop */
    }
  });
};

/** Alerte visible quand le stockage local sature (aucune réponse supprimée). */
export const onAnswerStorageSaturation = (
  listener: (saturated: boolean, pending: number) => void,
): (() => void) => {
  saturationListeners.add(listener);
  listener(storageSaturated, readQueue().length);
  return () => saturationListeners.delete(listener);
};

export const isAnswerStorageSaturated = (): boolean => storageSaturated;

/**
 * Refus explicite du serveur (passage déjà terminé, ou compte non propriétaire).
 * L'apprenant doit le voir IMMÉDIATEMENT : on n'affiche jamais « enregistré »
 * pour une réponse que la base n'a pas appliquée.
 */
export interface AnswerSaveRejection {
  exerciceId: string;
  /**
   * `frozen` / `forbidden` : refus historiques (passage terminé, compte non
   * propriétaire). `retake_delay` : règle des 48 h. `refused` : tout autre
   * refus fonctionnel explicite du serveur. Dans TOUS ces cas, répéter la même
   * requête ne peut pas la faire réussir : le renvoi automatique s'arrête.
   */
  reason: "frozen" | "forbidden" | "retake_delay" | "refused";
  at: string;
  /** Message explicite destiné à l'apprenant (refus définitif). */
  message?: string;
}

let lastRejection: AnswerSaveRejection | null = null;
const rejectionListeners = new Set<(rejection: AnswerSaveRejection | null) => void>();

const emitRejection = () => {
  rejectionListeners.forEach((listener) => {
    try {
      listener(lastRejection);
    } catch {
      /* noop */
    }
  });
};

const notifyAnswerSaveRejected = (
  exerciceId: string,
  reason: AnswerSaveRejection["reason"],
  message?: string,
) => {
  lastRejection = { exerciceId, reason, at: new Date().toISOString(), message };
  emitRejection();
};

export const onAnswerSaveRejected = (
  listener: (rejection: AnswerSaveRejection | null) => void,
): (() => void) => {
  rejectionListeners.add(listener);
  listener(lastRejection);
  return () => rejectionListeners.delete(listener);
};

export const clearAnswerSaveRejection = (): void => {
  if (!lastRejection) return;
  lastRejection = null;
  emitRejection();
};

function readQueue(): QueueItem[] {
  if (memoryQueue) return memoryQueue;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
}

const writeQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    // Écriture réussie : le miroir mémoire n'est plus nécessaire.
    memoryQueue = null;
    if (storageSaturated) {
      storageSaturated = false;
      emitSaturation(items.length);
    }
  } catch {
    // Stockage saturé : on CONSERVE tout en mémoire et on alerte.
    // Aucune réponse n'est supprimée pour libérer de la place.
    memoryQueue = items;
    if (!storageSaturated) {
      storageSaturated = true;
      emitSaturation(items.length);
    }
  }
};

const emit = () => {
  const pending = readQueue().filter(isActivelyPending).length;
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
  listener(state, readQueue().filter(isActivelyPending).length);
  return () => listeners.delete(listener);
}

export function getPendingAnswerSaves(): number {
  return readQueue().filter(isActivelyPending).length;
}

/** Réponses conservées mais refusées par le serveur (403) — jamais supprimées. */
export function getBlockedAnswerSaves(): number {
  return readQueue().filter((item) => item.blocked === true).length;
}

export function getPendingAnswers(
  apprenantId: string,
  exerciceId: string
): Record<string, unknown> | null {
  // Appareil partagé : on n'expose JAMAIS les réponses en attente d'un autre
  // compte. Elles restent en file pour leur propriétaire, sans être affichées
  // ni renvoyées sous une autre session.
  const matches = readQueue().filter(
    (item) =>
      item.payload.apprenant_id === apprenantId &&
      item.payload.exercice_id === exerciceId &&
      isOwnedByCurrentUser(item)
  );
  return matches.length > 0
    ? matches.reduce<Record<string, unknown>>(
        (merged, item) => ({ ...merged, ...(item.payload.reponses ?? {}) }),
        {}
      )
    : null;
}

/** Une valeur est « réellement saisie » (≠ vide) ? */
export function isMeaningfulAnswerValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

/**
 * RÈGLE GÉNÉRALE DE CONSERVATION (tous les quiz de l'application) :
 * une réponse réellement saisie ne peut jamais être masquée ni remplacée par
 * une valeur vide, ni par une valeur serveur plus ancienne qu'une réponse
 * locale encore en attente d'envoi.
 *
 * Aucune donnée n'est modifiée en base : c'est une règle de LECTURE.
 */
export function mergeSavedAndPendingAnswers(
  saved: Record<string, unknown> | null | undefined,
  apprenantId: string,
  exerciceId: string
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...(saved ?? {}) };
  const pending = getPendingAnswers(apprenantId, exerciceId);
  if (pending) {
    for (const [key, value] of Object.entries(pending)) {
      // La réponse locale est plus récente : elle gagne, sauf si elle est vide
      // alors qu'une réponse non vide existe déjà côté serveur.
      if (isMeaningfulAnswerValue(value) || !isMeaningfulAnswerValue(base[key])) {
        base[key] = value;
      }
    }
  }
  return base;
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

/**
 * Vide la file du compte connecté avant une déconnexion (tablette partagée :
 * l'apprenant suivant ne pourra pas envoyer ces réponses, elles doivent partir
 * tant que la session de leur propriétaire est encore valide).
 */
export async function flushOwnAnswerSavesBeforeLogout(timeoutMs = 8000): Promise<boolean> {
  if (!canSynchronizeAnswers()) return true;
  const hasOwn = () => readQueue().some(isSendableInCurrentContext);
  if (!hasOwn()) return true;
  void processQueue();
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!hasOwn()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!processing) void processQueue();
  }
  return !hasOwn();
}

export async function flushAnswerSavesAndWait(
  apprenantId: string,
  exerciceId: string,
  timeoutMs = 20000
): Promise<boolean> {
  if (!canSynchronizeAnswers() || apprenantId !== sessionApprenantId) return false;
  void processQueue();
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const pending = readQueue().some(
      (item) =>
        item.payload.apprenant_id === apprenantId &&
        item.payload.exercice_id === exerciceId &&
        isSendableInCurrentContext(item)
    );
    if (!pending) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!processing) void processQueue();
  }
  return false;
}

/**
 * Le token JWT courant + l'identifiant du compte connecté, mis à jour par
 * l'application à chaque changement de session.
 */
export function setAnswerSaveAuthToken(token: string | null, userId: string | null = null) {
  const userChanged = userId !== authUserId;
  authToken = token;
  authUserId = userId;
  if (userChanged) {
    // Nouveau compte connecté : ses éventuels éléments bloqués sont réessayés
    // une fois (rien n'est supprimé).
    const queue = readQueue();
    if (queue.some((item) => item.blocked && isOwnedByCurrentUser(item))) {
      writeQueue(
        queue.map((item) =>
          item.blocked && isOwnedByCurrentUser(item) ? { ...item, blocked: false } : item
        )
      );
    }
  }
  emit();
  if (token && canSynchronizeAnswers() && readQueue().some(isSendableInCurrentContext)) {
    void processQueue();
  }
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

type SendResult = "ok" | "retry" | "blocked";

async function sendItem(item: QueueItem): Promise<SendResult> {
  // Dernière barrière immédiatement avant l'Edge Function. Même si un ancien
  // timer ou événement appelle le worker, Vue apprenant ne peut jamais émettre
  // la requête réseau.
  if (!isSendableInCurrentContext(item)) return "blocked";
  const url = endpoint();
  const headers = buildHeaders();
  if (!url || !headers) return "retry";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(item.payload),
    });
    if (res.ok) {
      const confirmation = await res.json().catch(() => null);
      if (confirmation?.success === true && confirmation?.confirmed === true) {
        rememberWriteSeq(
          item.payload.apprenant_id,
          item.payload.exercice_id,
          Number(confirmation.write_seq ?? 0),
        );
        if (confirmation.frozen === true) {
          console.warn(
            "[answerPersistence] Tentative déjà terminée : réponse en attente non appliquée (journalisée)",
            item.payload.exercice_id,
          );
          // Refus silencieux impossible : l'apprenant est alerté immédiatement.
          notifyAnswerSaveRejected(item.payload.exercice_id, "frozen");
        } else {
          clearAnswerSaveRejection();
        }
        return "ok";
      }
      return "retry";
    }
    const text = await res.text();
    console.error("[answerPersistence] Échec sauvegarde", res.status, text);
    // 403 : le serveur refuse le lien compte ↔ dossier. Réessayer en boucle ne
    // sert à rien et masque les vraies erreurs ; l'élément est conservé
    // (aucune réponse n'est supprimée) et sera retenté au prochain changement
    // de session.
    if (res.status === 403) {
      notifyAnswerSaveRejected(item.payload.exercice_id, "forbidden");
      return "blocked";
    }
    return "retry";
  } catch (e) {
    console.error("[answerPersistence] Erreur réseau sauvegarde", e);
    return "retry";
  }
}

async function processQueue(): Promise<void> {
  if (processing) return;
  if (!canSynchronizeAnswers()) return;
  // Sans session valide, on n'envoie rien : la file attend la reconnexion.
  if (!authToken) {
    if (readQueue().some(isActivelyPending)) setState("error");
    return;
  }
  processing = true;
  try {
    let queue = readQueue();
    const sendable = (items: QueueItem[]) => items.filter(isSendableInCurrentContext);
    const itemsToTry = sendable(queue).length;
    let tried = 0;
    let hadFailure = false;
    while (tried < itemsToTry) {
      const item = sendable(queue)[0];
      if (!item) break;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setState("error");
        return;
      }
      setState("saving");
      const result = await sendItem(item);
      tried += 1;
      queue = readQueue();
      if (result === "ok") {
        // Retirer l'élément traité (identifié par son id).
        queue = queue.filter((q) => q.id !== item.id);
        writeQueue(queue);
      } else {
        const idx = queue.findIndex((q) => q.id === item.id);
        if (idx >= 0) {
          const refused = new Set(queue[idx].refused_user_ids ?? []);
          if (result === "blocked" && authUserId) refused.add(authUserId);
          const failed: QueueItem = {
            ...queue[idx],
            attempts: (queue[idx].attempts ?? 0) + 1,
            blocked: result === "blocked" ? true : queue[idx].blocked,
            refused_user_ids: refused.size > 0 ? [...refused] : undefined,
          };
          queue.splice(idx, 1);
          queue.push(failed);
          writeQueue(queue);
        }
        if (result === "retry") hadFailure = true;
      }
    }
    const remaining = queue.filter(isActivelyPending);
    if (remaining.length === 0) {
      setState("saved");
    } else {
      setState("error");
      const attempts = Math.max(...remaining.map((item) => item.attempts ?? 1), 1);
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
  // RÈGLE COMMUNE DE PROPRIÉTÉ : une réponse n'est mise en file que si le
  // dossier apprenant visé est bien celui de la session en cours. Sur un écran
  // de consultation (aperçu admin/formateur), rien n'est mis en file : on
  // n'écrit jamais sous le compte d'un autre apprenant.
  if (!canQueueAnswerSaveFor(payload.apprenant_id)) {
    console.warn(
      "[answerPersistence] Sauvegarde ignorée : la session en cours n'est pas propriétaire de ce dossier apprenant.",
      { exercice_id: payload.exercice_id },
    );
    return;
  }
  const item: QueueItem = {
    id: `${payload.exercice_id}__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`,
    payload: {
      ...payload,
      updated_at: payload.updated_at ?? new Date().toISOString(),
      base_seq: payload.base_seq ?? getKnownWriteSeq(payload.apprenant_id, payload.exercice_id),
      events: (payload.events ?? []).map((event) => ({
        ...event,
        event_id: event.event_id ?? makeEventId(),
        client_saved_at: event.client_saved_at ?? new Date().toISOString(),
      })),
    },
    queued_at: new Date().toISOString(),
    attempts: 0,
    owner_user_id: authUserId,
  };
  const queue = readQueue();
  // Compactage : une sauvegarde non envoyée du même exercice non terminée est
  // remplacée par la plus récente (la dernière réponse fait foi), mais les
  // événements question par question sont conservés et fusionnés.
  const sameExoIdx = queue.findIndex(
    (q) =>
      q.payload.exercice_id === payload.exercice_id &&
      q.payload.apprenant_id === payload.apprenant_id &&
      isOwnedByCurrentUser(q) &&
      !q.payload.completed &&
      !payload.completed
  );
  if (sameExoIdx >= 0) {
    const previous = queue[sameExoIdx];
    item.payload.events = [...(previous.payload.events ?? []), ...(item.payload.events ?? [])];
    // Compactage : on conserve le numéro d'écriture le PLUS ANCIEN des deux.
    // Prudence volontaire — si une écriture plus récente est arrivée côté
    // serveur entre-temps, elle ne sera pas écrasée.
    item.payload.base_seq = Math.min(
      previous.payload.base_seq ?? 0,
      item.payload.base_seq ?? 0,
    );
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
  if (!canSynchronizeAnswers()) return;
  // Uniquement les sauvegardes du compte connecté : celles d'un autre compte
  // seraient refusées (403) et restent en attente de leur propriétaire.
  const queue = readQueue().filter(isSendableInCurrentContext);
  if (queue.length === 0 || !authToken) return;
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
  // Le renvoi attend que CoursPublic ait identifié un véritable apprenant.
  // Au démarrage, la session peut être celle d'un admin qui va ouvrir un aperçu.
  setInterval(() => {
    if (readQueue().length > 0) void processQueue();
  }, 15000);
}
