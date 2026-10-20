export const MAX_ITEMS_SUITE = 24;
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