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