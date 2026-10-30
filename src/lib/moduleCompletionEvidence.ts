/** Read-only historical obligation proof; never uses correctness or today's additions. */
export function hasRecordedAnswer(value: unknown): boolean {
  if (typeof value === "string") return /\S/.test(value);
  if (Array.isArray(value)) return value.some(hasRecordedAnswer);
  if (value && typeof value === "object") return Object.values(value).some(hasRecordedAnswer);
  return typeof value === "number" || typeof value === "boolean";
}

/**
 * Miroir de `module_regles_validation` (contient_questions = true, protection_serveur = false) :
 * questions facultatives pour valider. La source d'autorité reste la table serveur.
 */
export const MODULES_QUESTIONS_FACULTATIVES: ReadonlySet<number> = new Set([3, 31, 60, 62, 63, 64, 90]);
const MODULES_EXAMENS_BLANCS: ReadonlySet<number> = new Set([35, 36, 37, 38]);

export interface CompletionEvidenceRow {
  module_id?: number;
  status?: string | null;
  completed_at?: string | null;
  details?: unknown;
  /**
   * Verdict de `etat_completion_modules` (serveur, même RLS que la lecture élève/admin).
   * undefined = non chargé (repli local), null = aucun périmètre récupérable.
   */
  preuve_serveur?: boolean | null;
  progress_preuve?: number | null;
}

export interface SubmittedModuleProof {
  exercice_id: string;
  status?: string | null;
  submitted_at?: string | null;
  reponses?: Record<string, unknown> | null;
}

/**
 * Obligation réelle : une QCM (corrigé non vide). Une QRC (corrigé vide) peut être validée sans
 * réponse par l'écran du quiz : elle n'est donc jamais exigée ici. Ancien format sans corrigé = exigé.
 */
export function questionObligatoire(d: any): boolean {
  if (!d || typeof d !== "object" || d.exerciceId == null || d.questionId == null) return false;
  const rc = d.reponseCorrecte;
  return !(Array.isArray(rc) && rc.length === 0);
}

/** A single submitted quiz must cover its entire historical scope; drafts/revisions never repair proof. */
export function withSubmittedModuleProof<T extends CompletionEvidenceRow>(row: T, attempts: readonly SubmittedModuleProof[]): T {
  if (!Array.isArray(row.details)) return row;
  const details = row.details;
  const proofs = new Map<string, SubmittedModuleProof>();
  for (const attempt of attempts) {
    if (attempt.status !== "submitted" || !attempt.submitted_at || !attempt.reponses || typeof attempt.reponses !== "object") continue;
    const match = /^module_(\d+)_exo_(\d+)$/.exec(attempt.exercice_id);
    if (!match || Number(match[1]) !== Number(row.module_id)) continue;
    const exo = match[2];
    const required = details.filter(d => String(d?.exerciceId) === exo && questionObligatoire(d));
    if (required.length && required.every(d => hasRecordedAnswer(attempt.reponses?.[`${exo}-${d.questionId}`]))) proofs.set(exo, attempt);
  }
  if (!proofs.size) return row;
  return { ...row, details: details.map(d => {
    const proof = proofs.get(String(d?.exerciceId));
    return proof && questionObligatoire(d) && !hasRecordedAnswer(d?.reponseEleve) ? { ...d, reponseEleve: proof.reponses?.[`${d.exerciceId}-${d.questionId}`] } : d;
  }) };
}

/** null means no recoverable question perimeter, not a fabricated success. */
export function historicalQuestionsComplete(row: CompletionEvidenceRow): boolean | null {
  if (!Array.isArray(row.details)) return null;
  const questions = row.details.filter(questionObligatoire);
  if (!questions.length) return null;
  return questions.every(d => hasRecordedAnswer(d.reponseEleve));
}

/** Persistence status is retained; only the effective projection can be incomplete. */
export function completionEvidenceAllowsDone(row: CompletionEvidenceRow): boolean {
  // Verdict serveur prioritaire : une seule source pour élève, admin et EDOF.
  if (row.preuve_serveur !== undefined) return row.preuve_serveur !== false;
  // Exam modules have a separate same-attempt engine, not ordinary quiz details.
  if (MODULES_EXAMENS_BLANCS.has(Number(row.module_id))) return true;
  if (MODULES_QUESTIONS_FACULTATIVES.has(Number(row.module_id))) return true;
  return historicalQuestionsComplete(row) !== false;
}

/** Live display only. The persisted status/date and frozen calculations stay untouched. */
export function liveCompletionEvidence<T extends CompletionEvidenceRow & { progress?: number | null }>(row: T): T {
  if (completionEvidenceAllowsDone(row)) return row;
  if (row.preuve_serveur === false && row.progress_preuve != null) {
    return { ...row, status: "in_progress", progress: Number(row.progress_preuve) };
  }
  if (!Array.isArray(row.details)) return row;
  const questions = row.details.filter(questionObligatoire);
  const answered = questions.filter(d => hasRecordedAnswer(d.reponseEleve)).length;
  const evidenceProgress = questions.length ? answered / questions.length * 100 : 0;
  return { ...row, status: "in_progress", progress: Math.min(99.9, Number(row.progress ?? 100), evidenceProgress) };
}
