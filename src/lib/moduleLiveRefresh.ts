/**
 * Rafraîchissement « live » d'un contenu volumineux (module de cours, banque de
 * questions) sans relire tout le contenu à chaque tic.
 *
 * Mesure du 30/10 (statistiques serveur) : la relecture complète d'un module
 * (`module_editor_state.module_data`, 0,5 à 0,6 Mo de JSON) déclenchée toutes
 * les 5 s par chaque élève représentait 36,7 % du temps d'exécution de la base,
 * et la relecture de la banque nationale toutes les 15 s 12,6 %.
 *
 * Principe :
 *  - tic périodique et retour sur l'onglet = SONDE légère (jeton de version) ;
 *    relecture complète seulement si le jeton a changé ;
 *  - relecture complète de sécurité à intervalle borné (événement manqué,
 *    écriture sans changement de date) ;
 *  - une seule relecture à la fois ; les demandes simultanées sont fusionnées
 *    (au plus une relecture de rattrapage) ;
 *  - événements Realtime : petit décalage aléatoire pour ne pas faire relire
 *    tous les élèves dans la même seconde après une sauvegarde Admin ;
 *  - erreur de lecture (pool saturé, délai SQL…) : attente exponentielle
 *    bornée avec gigue, jamais de rafale. Une erreur ne vide jamais l'écran :
 *    l'affichage précédent est conservé par l'appelant.
 */

export interface LiveRefresherOptions {
  /** Lecture légère : renvoie le jeton de version courant, ou `null` en cas d'erreur. */
  probe: () => Promise<string | null>;
  /**
   * Relecture complète (applique le contenu) ; `false` = erreur de lecture ;
   * `"pending"` = lecture réussie mais pas encore appliquée (édition en cours) :
   * ni attente d'erreur, ni jeton retenu, le tic suivant relira.
   */
  fetchFull: () => Promise<boolean | "pending">;
  isHidden?: () => boolean;
  now?: () => number;
  random?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Décalage aléatoire maximal appliqué aux événements Realtime (défaut 1 500 ms). */
  realtimeJitterMs?: number;
  /** Relecture complète de sécurité même si le jeton n'a pas changé (défaut 120 s). */
  safetyFullMs?: number;
  /** Attente après la 1re erreur ; doublée à chaque erreur, plafonnée (défauts 5 s / 60 s). */
  backoffBaseMs?: number;
  backoffMaxMs?: number;
}

export type PollOutcome =
  | "hidden"
  | "backoff"
  | "coalesced"
  | "unchanged"
  | "full-changed"
  | "full-safety"
  | "probe-error";

export interface LiveRefresher {
  /** Tic périodique / retour sur l'onglet : sonde puis relecture si nécessaire. */
  poll: (opts?: { ignoreHidden?: boolean }) => Promise<PollOutcome>;
  /** Événement Realtime / broadcast : relecture complète décalée et fusionnée. */
  trigger: () => void;
  /** Relecture complète immédiate (fusionnée avec une relecture en cours). */
  fullNow: () => Promise<void>;
  /** Jeton connu (ex. chargement initial effectué ailleurs). */
  noteToken: (token: string | null | undefined) => void;
  dispose: () => void;
  /** Lecture seule pour les tests / le diagnostic. */
  stats: () => { probes: number; fullFetches: number; failures: number; token: string | null };
}

type FullOutcome = "ok" | "error" | "pending";

export function createLiveRefresher(o: LiveRefresherOptions): LiveRefresher {
  const now = o.now ?? (() => Date.now());
  const random = o.random ?? Math.random;
  const isHidden = o.isHidden ?? (() => typeof document !== "undefined" && document.hidden === true);
  const setTimer = o.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = o.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const jitterMax = Math.max(0, o.realtimeJitterMs ?? 1500);
  const safetyMs = o.safetyFullMs ?? 120_000;
  const backoffBase = o.backoffBaseMs ?? 5_000;
  const backoffMax = o.backoffMaxMs ?? 60_000;

  let token: string | null = null;
  let lastFullAt = now();
  let inFlight: Promise<FullOutcome> | null = null;
  let trailing = false;
  let probing = false;
  let failures = 0;
  let backoffUntil = 0;
  let pendingTimer: unknown = null;
  let disposed = false;
  let probes = 0;
  let fullFetches = 0;

  const markFailure = () => {
    failures += 1;
    const wait = Math.min(backoffMax, backoffBase * 2 ** Math.min(failures - 1, 10));
    // Gigue ±20 % : les élèves en erreur ne réessaient pas tous ensemble.
    backoffUntil = now() + Math.round(wait * (0.8 + random() * 0.4));
  };
  const markSuccess = () => {
    failures = 0;
    backoffUntil = 0;
  };

  let lastOutcome: FullOutcome = "ok";
  const runFull = (): Promise<FullOutcome> => {
    if (inFlight) {
      trailing = true;
      return inFlight;
    }
    inFlight = (async () => {
      do {
        trailing = false;
        if (disposed) return lastOutcome;
        fullFetches += 1;
        let outcome: FullOutcome = "error";
        try {
          const r = await o.fetchFull();
          outcome = r === false ? "error" : r === "pending" ? "pending" : "ok";
        } catch {
          outcome = "error";
        }
        lastOutcome = outcome;
        if (outcome === "error") {
          markFailure();
          trailing = false; // pas de rafale après une erreur : l'attente bornée s'applique
        } else {
          markSuccess();
          lastFullAt = now();
        }
      } while (trailing && !disposed);
      return lastOutcome;
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    async poll(opts) {
      if (disposed) return "coalesced";
      if (!opts?.ignoreHidden && isHidden()) return "hidden";
      if (now() < backoffUntil) return "backoff";
      if (inFlight || probing) return "coalesced";
      if (now() - lastFullAt >= safetyMs) {
        await runFull();
        return "full-safety";
      }
      probing = true;
      let current: string | null = null;
      try {
        probes += 1;
        current = await o.probe();
      } catch {
        current = null;
      } finally {
        probing = false;
      }
      if (disposed) return "coalesced";
      if (current === null) {
        markFailure();
        return "probe-error";
      }
      markSuccess();
      if (token !== null && current === token) return "unchanged";
      // Le jeton n'est retenu qu'après une relecture complète réussie : une
      // erreur fait relire au tic suivant (après l'attente bornée).
      if ((await runFull()) === "ok") token = current;
      return "full-changed";
    },
    trigger() {
      if (disposed || pendingTimer !== null) return;
      const delay = Math.round(random() * jitterMax);
      pendingTimer = setTimer(() => {
        pendingTimer = null;
        if (disposed) return;
        // Une erreur récente impose d'attendre : la relecture partira au tic suivant.
        if (now() < backoffUntil) return;
        void runFull();
      }, delay);
    },
    async fullNow() {
      if (disposed) return;
      await runFull();
    },
    noteToken(t) {
      if (typeof t === "string" && t) token = t;
    },
    dispose() {
      disposed = true;
      if (pendingTimer !== null) clearTimer(pendingTimer);
      pendingTimer = null;
    },
    stats: () => ({ probes, fullFetches, failures, token }),
  };
}

/** Jeton d'une ou plusieurs lignes `module_editor_state` (id + date de mise à jour). */
export function moduleVersionToken(rows: Array<{ module_id?: unknown; updated_at?: unknown }> | null | undefined): string {
  return (rows ?? [])
    .map((r) => `${Number(r?.module_id)}:${String(r?.updated_at ?? "")}`)
    .sort()
    .join("|");
}

/** Jeton compact d'une banque de questions (identité, ordre, activation, date). */
export function questionBankToken(
  rows: Array<{ question_id?: unknown; updated_at?: unknown; active?: unknown; position?: unknown; section_id?: unknown }> | null | undefined,
): string {
  let h = 5381;
  const list = rows ?? [];
  for (const r of list) {
    const s = `${String(r?.question_id)}|${String(r?.section_id)}|${String(r?.position)}|${String(r?.active)}|${String(r?.updated_at)};`;
    for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return `${list.length}:${(h >>> 0).toString(36)}`;
}
