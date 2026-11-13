// Presentation-only state: no answers, grades or exam timers are stored here.
const warned = new Set<string>();
export const EXAM_EXIT_WARNING = "Attention : terminez la matière avant de sortir. Le chronomètre continue de tourner et vous risquez de rencontrer des difficultés pour reprendre l’épreuve si le temps expire. Voulez-vous vraiment quitter ?";

export function remainingFromAnchor(seconds: number, anchoredAt: number, now: number) {
  return Math.max(0, seconds - Math.floor(Math.max(0, now - anchoredAt) / 1000));
}

export function claimTimeWarning(attemptKey: string, seconds: number): 5 | 2 | null {
  if (seconds <= 0 || seconds > 300) return null;
  const threshold = seconds <= 120 ? 2 : 5;
  const key = `exam-ux-warning:${attemptKey}:${threshold}`;
  const has = (k: string) => {
    try { return warned.has(k) || sessionStorage.getItem(k) === "shown"; }
    catch { return warned.has(k); }
  };
  const mark = (k: string) => {
    warned.add(k);
    try { sessionStorage.setItem(k, "shown"); } catch { /* memory fallback */ }
  };
  if (threshold === 2) mark(`exam-ux-warning:${attemptKey}:5`);
  if (has(key)) return null;
  mark(key);
  return threshold;
}