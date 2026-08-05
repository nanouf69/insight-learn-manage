/**
 * Calcul unique et fiable de la fin réelle d'une session de connexion e-learning.
 *
 * Problème corrigé : une session laissée ouverte (onglet non fermé, veille du PC)
 * était fermée automatiquement par le serveur au bout de 7h (`end_reason = max_duration`
 * ou `no_response`). Le relevé comptabilisait alors 7h alors que l'apprenant
 * n'avait été réellement actif que quelques minutes.
 *
 * Règle appliquée (identique écran + PDF + tableaux de bord) :
 *   fin = min(
 *     fin enregistrée (ended_at ou last_seen_at),
 *     début + 7h  (plafond absolu),
 *     dernière activité réelle + 30 min de tolérance d'inactivité
 *   )
 */
export const MAX_SESSION_DURATION_MS = 7 * 60 * 60 * 1000;
/** Tolérance d'inactivité (aligné sur la politique de présence : 30 min). */
export const INACTIVITY_GRACE_MS = 30 * 60 * 1000;

export interface SessionLike {
  started_at: string;
  ended_at?: string | null;
  last_seen_at?: string | null;
  last_action_at?: string | null;
}

const ts = (v?: string | null): number | null => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * Convertit une date de fin d'accès (YYYY-MM-DD ou ISO) en timestamp de coupure :
 * fin du jour (23:59:59.999) de cette date. Aucune heure/minute de connexion
 * postérieure à cette coupure n'est comptabilisée (écran, PDF, dashboards).
 */
export function getAccessCutoffMs(dateFin?: string | null): number | null {
  if (!dateFin) return null;
  const base = String(dateFin).slice(0, 10);
  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** true si la session doit être totalement ignorée (démarrée après la fin d'accès). */
export function isSessionAfterAccessEnd(c: SessionLike, cutoffMs?: number | null): boolean {
  if (!cutoffMs) return false;
  const start = ts(c.started_at);
  return start !== null && start > cutoffMs;
}

/** Filtre les connexions postérieures à la fin d'accès à la formation. */
export function filterSessionsWithinAccess<T extends SessionLike>(
  list: T[],
  cutoffMs?: number | null,
): T[] {
  if (!cutoffMs) return list;
  return list.filter((c) => !isSessionAfterAccessEnd(c, cutoffMs));
}

/** Retourne la fin réelle de la session (timestamp ms), plafonnée. */
export function getSessionEndMs(c: SessionLike, cutoffMs?: number | null): number {
  const start = ts(c.started_at) ?? 0;
  const rawEnd = ts(c.ended_at) ?? ts(c.last_seen_at) ?? start;

  let end = Math.min(rawEnd, start + MAX_SESSION_DURATION_MS);

  // Plafonnement sur la dernière activité réelle connue
  const lastActivity = Math.max(ts(c.last_action_at) ?? 0, ts(c.last_seen_at) ?? 0);
  if (lastActivity > 0) {
    end = Math.min(end, lastActivity + INACTIVITY_GRACE_MS);
  }

  // Plafonnement sur la fin d'accès à la formation
  if (cutoffMs) end = Math.min(end, cutoffMs);

  return Math.max(start, end);
}


/** Fin réelle sous forme de Date. */
export function getSessionEndDate(c: SessionLike, cutoffMs?: number | null): Date {
  return new Date(getSessionEndMs(c, cutoffMs));
}

/** Durée réelle de la session en minutes (entier). */
export function getSessionDurationMinutes(c: SessionLike, cutoffMs?: number | null): number {
  const start = ts(c.started_at) ?? 0;
  if (isSessionAfterAccessEnd(c, cutoffMs)) return 0;
  return Math.max(0, Math.floor((getSessionEndMs(c, cutoffMs) - start) / 60000));
}


/**
 * Filtre + tronque une liste de connexions à la date de fin d'accès à la formation.
 * - les sessions démarrées après la fin d'accès sont supprimées
 * - les sessions à cheval sont tronquées à la fin d'accès
 * Utilisé par tous les rapports (écran, PDF, ZIP, CSV) pour garantir la parité.
 */
export function clampConnexionsToAccessEnd<T extends SessionLike>(
  rows: T[],
  dateFin?: string | null,
): T[] {
  const cutoff = getAccessCutoffMs(dateFin);
  if (!cutoff) return rows;
  const cutIso = new Date(cutoff).toISOString();
  const trunc = (v?: string | null) => {
    const t = ts(v);
    if (t === null) return v ?? null;
    return t > cutoff ? cutIso : v!;
  };
  return rows
    .filter((r) => !isSessionAfterAccessEnd(r, cutoff))
    .map((r) => ({
      ...r,
      ended_at: trunc(r.ended_at),
      last_seen_at: trunc(r.last_seen_at),
      last_action_at: trunc(r.last_action_at),
    }));
}
