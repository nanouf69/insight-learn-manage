/** Une réservation active n'est jamais rejouée automatiquement, même après expiration. */
export const MAX_REPRISES_QRC = 2;
export function repriseAutorisee(statut: string, status: number | null, fin: string | null, debut: string, interruptionConfirmee: boolean, now = Date.now()) {
  if (statut === 'erreur') return !!fin && (status === 429 || (status !== null && status >= 500)) && now - Date.parse(fin) >= 30000;
  return statut === 'en_cours' && !fin && interruptionConfirmee && now - Date.parse(debut) >= 600000;
}