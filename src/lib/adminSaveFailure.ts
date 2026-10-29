// Suivi d'un enregistrement Admin refusé par le serveur (ex. 57014 statement timeout).
// La modification reste à l'écran comme NON enregistrée ; seul un clic explicite
// la renvoie (aucune répétition automatique), et un succès plus récent l'efface.

export type RevisionedPayload = { local_revision?: number };

const rev = (p: RevisionedPayload | null | undefined) => p?.local_revision ?? -1;

/** Nouvel état « échec en attente » après une tentative d'enregistrement. */
export function nextFailedSave<T extends RevisionedPayload>(failed: T | null, attempted: T, saved: boolean): T | null {
  if (!saved) return attempted;
  if (!failed) return null;
  // Un succès ne couvre l'échec que s'il contient au moins la même révision locale.
  return failed === attempted || rev(failed) <= rev(attempted) ? null : failed;
}

/** Charge utile renvoyée par « Réessayer » : la plus récente des deux. */
export function retryPayload<T extends RevisionedPayload>(failed: T | null, pending: T | null): T | null {
  if (!failed) return null;
  return pending && rev(pending) >= rev(failed) ? pending : failed;
}

/** Erreur serveur de délai dépassé (Postgres 57014). */
export function isStatementTimeout(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined;
  return e?.code === "57014" || /statement timeout/i.test(String(e?.message ?? ""));
}
