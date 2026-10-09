import { getSessionEndMs, type SessionLike } from "./session-duration";

// Calculation scope is independent of historical visibility and access dates.
const LEARNING_STARTS: Readonly<Record<string, number>> = {
  "c048754d-9045-4ab6-b89f-a5ab26de314c": Date.parse("2026-10-06T00:00:00+02:00"),
};

export function getLearningHoursStartMs(apprenantId?: string): number | null {
  return apprenantId ? LEARNING_STARTS[apprenantId] ?? null : null;
}

export function learningSessionWindow(c: SessionLike, apprenantId?: string, cutoffMs?: number | null) {
  // Compute the end from the ORIGINAL start: clipping must not reset the 7h cap.
  const end = getSessionEndMs(c, cutoffMs);
  const start = Math.max(Date.parse(c.started_at), getLearningHoursStartMs(apprenantId) ?? -Infinity);
  return { start, end, minutes: Number.isFinite(start) ? Math.max(0, Math.floor((end - start) / 60000)) : 0 };
}

export function learningSessionMinutes(c: SessionLike, apprenantId?: string, cutoffMs?: number | null): number {
  return learningSessionWindow(c, apprenantId, cutoffMs).minutes;
}