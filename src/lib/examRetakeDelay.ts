/**
 * DÉLAI AVANT DE REFAIRE UN EXAMEN BLANC — RÈGLE UNIQUE DU PROJET.
 *
 * 2 jours complets = 48 heures après la FIN d'une tentative (terminée ou en
 * attente de correction QRC) avant de pouvoir en commencer une nouvelle.
 *
 * Portée : UNIQUEMENT les Examens Blancs (VTC, TAXI, VA, TA).
 * Exception absolue : le e-learning (quiz de modules, exercices, bilans,
 * révisions) n'est JAMAIS concerné.
 *
 * Une tentative EN COURS reste toujours reprenable : ce module ne bloque que
 * le démarrage d'une NOUVELLE tentative. Aucune donnée n'est modifiée ici.
 */

/** 48 heures en millisecondes. */
export const EXAM_RETAKE_DELAY_MS = 48 * 60 * 60 * 1000;

export interface ExamRetakeLock {
  /** true = nouvelle tentative interdite pour l'instant. */
  locked: boolean;
  /** Date/heure à partir de laquelle une nouvelle tentative est autorisée. */
  availableAt: Date | null;
  /** Millisecondes restantes avant déblocage (0 si autorisé). */
  remainingMs: number;
}

const toMs = (value: Date | string | number | null | undefined): number => {
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime() || 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Calcule le verrou à partir de la fin de la dernière tentative.
 * 47 h 59 → bloqué ; 48 h pile → autorisé.
 */
export function computeExamRetakeLock(
  lastFinishedAt: Date | string | number | null | undefined,
  now: Date | string | number = Date.now(),
): ExamRetakeLock {
  const last = toMs(lastFinishedAt);
  const nowMs = toMs(now);
  if (!last) return { locked: false, availableAt: null, remainingMs: 0 };
  const availableMs = last + EXAM_RETAKE_DELAY_MS;
  const remaining = availableMs - nowMs;
  if (remaining <= 0) return { locked: false, availableAt: new Date(availableMs), remainingMs: 0 };
  return { locked: true, availableAt: new Date(availableMs), remainingMs: remaining };
}

/** « 23/09/2026 à 15h30 » (heure de Paris). */
export function formatRetakeAvailability(date: Date | string | number | null | undefined): string {
  const ms = toMs(date);
  if (!ms) return "";
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} à ${get("hour")}h${get("minute")}`;
}

/** Message affiché à l'apprenant quand la nouvelle tentative est verrouillée. */
export function examRetakeLockMessage(availableAt: Date | string | number | null | undefined): string {
  return `🔒 Refaire l'examen indisponible — vous pourrez refaire cet examen le ${formatRetakeAvailability(availableAt)}.`;
}
