// Trace technique d'un appel IA QRC : étapes horodatées, code passerelle réel
// distinct du code d'abandon local, identifiant d'exécution passerelle.
// Jamais de contenu (question, réponse, texte IA), jamais de clé ni de jeton.
export type TraceAppelIa = {
  budget_ms: number;
  requete_at: string | null;
  entetes_at: string | null;
  premier_jeton_at: string | null;
  fin_at: string | null;
  abort_at: string | null;
  http_passerelle: number | null;
  code_local: string | null;
  run_id: string | null;
  fin_raison: string | null;
};

export function nouvelleTrace(budgetMs: number): TraceAppelIa {
  return { budget_ms: budgetMs, requete_at: null, entetes_at: null, premier_jeton_at: null, fin_at: null, abort_at: null, http_passerelle: null, code_local: null, run_id: null, fin_raison: null };
}

const ISO = () => new Date().toISOString();
export function marquerEntetes(t: TraceAppelIa, status: number, runId: string | null) {
  t.entetes_at ??= ISO(); t.http_passerelle = status; t.run_id = runId ? runId.slice(0, 80) : null;
}
export function marquerPremierJeton(t: TraceAppelIa) { t.premier_jeton_at ??= ISO(); }

/** Étape atteinte au moment d'un abandon : explique où l'appel s'est arrêté. */
export function etapeAtteinte(t: TraceAppelIa): 'avant_entetes' | 'entetes_sans_jeton' | 'flux_partiel' | 'termine' {
  if (t.fin_at) return 'termine';
  if (!t.entetes_at) return 'avant_entetes';
  return t.premier_jeton_at ? 'flux_partiel' : 'entetes_sans_jeton';
}
export function marquerAbort(t: TraceAppelIa) { t.abort_at ??= ISO(); t.code_local = `abort_local_${etapeAtteinte(t)}`; }

/**
 * Budget d'un appel IA (22/10 → 23/10).
 * Observé au journal passerelle du 22/10 : succès en 2,3 à 25,4 s ; échecs = 0 jeton à 60 s.
 * La fonction répond de façon synchrone pour les reprises admin : la limite
 * d'inactivité d'une requête Edge est de 150 s, d'où 140 s (≈ 5,5 × le plus lent observé).
 * Au-delà : abandon local, issue inconnue → revue, jamais rejoué automatiquement.
 */
export const BUDGET_APPEL_IA_MS = 140_000;
