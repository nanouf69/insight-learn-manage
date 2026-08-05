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

/** Retourne la fin réelle de la session (timestamp ms), plafonnée. */
export function getSessionEndMs(c: SessionLike): number {
  const start = ts(c.started_at) ?? 0;
  const rawEnd = ts(c.ended_at) ?? ts(c.last_seen_at) ?? start;

  let end = Math.min(rawEnd, start + MAX_SESSION_DURATION_MS);

  // Plafonnement sur la dernière activité réelle connue
  const lastActivity = Math.max(ts(c.last_action_at) ?? 0, ts(c.last_seen_at) ?? 0);
  if (lastActivity > 0) {
    end = Math.min(end, lastActivity + INACTIVITY_GRACE_MS);
  }

  return Math.max(start, end);
}

/** Fin réelle sous forme de Date. */
export function getSessionEndDate(c: SessionLike): Date {
  return new Date(getSessionEndMs(c));
}

/** Durée réelle de la session en minutes (entier). */
export function getSessionDurationMinutes(c: SessionLike): number {
  const start = ts(c.started_at) ?? 0;
  return Math.max(0, Math.floor((getSessionEndMs(c) - start) / 60000));
}
