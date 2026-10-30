/** Read-only historical obligation proof; never uses correctness or today's additions. */
export function hasRecordedAnswer(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasRecordedAnswer);
  if (value && typeof value === "object") return Object.values(value).some(hasRecordedAnswer);
  return typeof value === "number" || typeof value === "boolean";
}

export interface CompletionEvidenceRow {
  module_id?: number;
  status?: string | null;
  completed_at?: string | null;
  details?: unknown;
}

export interface SubmittedModuleProof {
  exercice_id: string;
  status?: string | null;
  submitted_at?: string | null;
  reponses?: Record<string, unknown> | null;
}

/** A single submitted quiz must cover its entire historical scope; drafts/revisions never repair proof. */
export function withSubmittedModuleProof<T extends CompletionEvidenceRow>(row: T, attempts: readonly SubmittedModuleProof[]): T {
  if (!Array.isArray(row.details)) return row;
  const details = row.details;
  const proofs = new Map<string, SubmittedModuleProof>();
  for (const attempt of attempts) {
    if (attempt.status !== "submitted" || !attempt.submitted_at || !attempt.reponses) continue;
    const match = /^module_(\d+)_exo_(\d+)$/.exec(attempt.exercice_id);
    if (!match || Number(match[1]) !== Number(row.module_id)) continue;
    const exo = match[2];
    const required = details.filter(d => String(d?.exerciceId) === exo && d?.questionId != null);
    if (required.length && required.every(d => hasRecordedAnswer(attempt.reponses?.[`${exo}-${d.questionId}`]))) proofs.set(exo, attempt);
  }
  if (!proofs.size) return row;
  return { ...row, details: details.map(d => {
    const proof = proofs.get(String(d?.exerciceId));
    return proof && !hasRecordedAnswer(d?.reponseEleve) ? { ...d, reponseEleve: proof.reponses?.[`${d.exerciceId}-${d.questionId}`] } : d;
  }) };
}

/** null means no recoverable question perimeter, not a fabricated success. */
export function historicalQuestionsComplete(row: CompletionEvidenceRow): boolean | null {
  if (!Array.isArray(row.details)) return null;
  const questions = row.details.filter(d => d?.exerciceId != null && d?.questionId != null);
  if (!questions.length) return null;
  return questions.every(d => hasRecordedAnswer(d.reponseEleve));
}

/** Persistence status is retained; only the effective projection can be incomplete. */
export function completionEvidenceAllowsDone(row: CompletionEvidenceRow): boolean {
  // Exam modules have a separate same-attempt engine, not ordinary quiz details.
  if ([35, 36, 37, 38].includes(Number(row.module_id))) return true;
  return historicalQuestionsComplete(row) !== false;
}

/** Live display only. The persisted status/date and frozen calculations stay untouched. */
export function liveCompletionEvidence<T extends CompletionEvidenceRow & { progress?: number | null }>(row: T): T {
  if (completionEvidenceAllowsDone(row) || !Array.isArray(row.details)) return row;
  const questions = row.details.filter(d => d?.exerciceId != null && d?.questionId != null);
  const answered = questions.filter(d => hasRecordedAnswer(d.reponseEleve)).length;
  const evidenceProgress = questions.length ? answered / questions.length * 100 : 0;
  return { ...row, status: "in_progress", progress: Math.min(99.9, Number(row.progress ?? 100), evidenceProgress) };
}