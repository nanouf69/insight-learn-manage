/** Staged: never enable before atomic server installation and backup/restore approval. */
export const EMARGEMENT_TARDIF_ACTIF = false;

export interface AutorisationTardive {
  id: string;
  auth_user_id: string;
  apprenant_id: string;
  expire_le: string;
  creneaux: Array<{ date: string; creneau: string }>;
}

export function autorisationsPourCreneau(rows: AutorisationTardive[], userId: string, apprenantId: string, date: string, creneau: string) {
  // Expiry/eligibility are rechecked by the server, not granted by the device clock.
  return rows.filter(r => r.auth_user_id === userId && r.apprenant_id === apprenantId &&
    Array.isArray(r.creneaux) && r.creneaux.some(s => s.date === date && s.creneau === creneau));
}

export function signatureTardive(dateCours: string, signedAt?: string | null): boolean {
  if (!signedAt || !Number.isFinite(Date.parse(signedAt))) return false;
  const dateSignature = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(signedAt));
  return /^\d{4}-\d{2}-\d{2}$/.test(dateCours) && dateSignature > dateCours;
}

/** Single-flight before the first await; no automatic replay on uncertain delivery. */
export function signatureSingleFlight<T>(execute: () => Promise<T>) {
  let inFlight: Promise<T> | null = null;
  return () => {
    if (inFlight) return inFlight;
    inFlight = Promise.resolve().then(execute).finally(() => { inFlight = null; });
    return inFlight;
  };
}