export const MAX_ITEMS_SUITE = 24;
/** Délai maximal d'un appel fournisseur ; au-delà, abandon local, rien n'est publié. */
export const TIMEOUT_IA_MS = 60000;
export type TraceIa = { statut: string; http_status: number | null; termine_at: string | null; created_at: string; numero?: number };
/** Only completed upstream transient failures are retryable; unknown work is terminal for automation. */
export function prochaineActionIa(trace: TraceIa | null, now = Date.now()): { action: 'appel' | 'attendre' | 'revue' | 'fin'; delai: number } {
  if (!trace) return { action: 'appel', delai: 0 };
  if (trace.statut === 'appliquee' || trace.statut === 'ignoree') return { action: 'fin', delai: 0 };
  if (trace.statut === 'en_cours') return { action: 'revue', delai: 0 };
  if (trace.statut !== 'erreur' || !trace.termine_at || !(trace.http_status === 429 || (trace.http_status !== null && trace.http_status >= 500 && trace.http_status <= 599)) || (trace.numero ?? 0) >= 2) return { action: 'revue', delai: 0 };
  const delai = Math.max(0, Date.parse(trace.termine_at) + 60000 * 2 ** (trace.numero ?? 0) - now);
  return { action: delai ? 'attendre' : 'appel', delai };
}

export type ActionQrc = { id: string; action: 'appel' | 'attendre' | 'revue' | 'fin'; delai: number };
export type PlanSuite = { type: 'appel'; id: string } | { type: 'attente'; delai: number } | { type: 'a_verifier'; nb: number } | { type: 'terminee' };
/**
 * Choix de la suite pour un passage. Une QRC en attente de délai ou en revue
 * ne bloque jamais les autres QRC du passage. « terminee » seulement quand
 * plus aucune QRC admissible ne reste à traiter ni en revue.
 */
export function planSuite(actions: ActionQrc[], revueNonAdmissible = false): PlanSuite {
  const appel = actions.find((a) => a.action === 'appel');
  if (appel) return { type: 'appel', id: appel.id };
  const attentes = actions.filter((a) => a.action === 'attendre');
  if (attentes.length) return { type: 'attente', delai: Math.max(60000, Math.min(...attentes.map((a) => a.delai))) };
  const nb = actions.filter((a) => a.action === 'revue').length;
  if (nb || revueNonAdmissible) return { type: 'a_verifier', nb };
  return { type: 'terminee' };
}

export type EchecIa = { status: number; statut: 'erreur' | 'a_verifier'; code: string; reprisable: boolean };
/**
 * Classement d'un échec d'appel IA :
 * - après réponse complète du fournisseur (publication/relecture) : jamais refacturé → revue ;
 * - délai local dépassé : abandon local seulement, le fournisseur a pu traiter/facturer → revue, jamais rejoué ;
 * - statut fournisseur connu : 429/5xx reprisables, autres terminaux ;
 * - sans statut : issue inconnue → revue (dead letter), jamais rejoué.
 */
export function classerEchecIa(e: { providerFinished: boolean; timeoutLocal: boolean; statusCode?: number }): EchecIa {
  if (e.providerFinished) return { status: 499, statut: 'a_verifier', code: 'publication_ou_relecture_echouee', reprisable: false };
  if (e.timeoutLocal) return { status: 504, statut: 'a_verifier', code: 'timeout_local_issue_inconnue', reprisable: false };
  if (typeof e.statusCode === 'number' && e.statusCode >= 100) {
    const s = e.statusCode;
    return { status: s, statut: 'erreur', code: `http_${s}`, reprisable: s === 429 || (s >= 500 && s <= 599) };
  }
  return { status: 499, statut: 'a_verifier', code: 'flux_interrompu_issue_inconnue', reprisable: false };
}
