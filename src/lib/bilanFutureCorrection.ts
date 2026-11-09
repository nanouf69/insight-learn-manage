/**
 * Correction of a SUBMITTED future Bilan examen passage (read-only).
 * Source = bilan_future_correction: the immutable submitted answers + keys of the frozen version.
 * Review sessions are computed locally and never written anywhere.
 */
export type CorrectionQuestion = { id: number; answer: string[]; correct: string[]; explication?: string | null };
export type Correction = { receiptId: string; versionId: string; correctCount: number; questionCount: number; questions: CorrectionQuestion[] };

const norm = (a: unknown): string[] => (Array.isArray(a) ? a.map(String) : []).slice().sort();

/** Exact match only: every correct choice checked and no wrong one. */
export function reponseExacte(answer: unknown, correct: unknown): boolean {
  const a = norm(answer), c = norm(correct);
  return c.length > 0 && a.length === c.length && a.every((x, i) => x === c[i]);
}

export function lireCorrection(data: any, receiptId: string, versionId: string): Correction | null {
  if (!data || data.receipt_id !== receiptId || data.version_id !== versionId || !Array.isArray(data.questions)) return null;
  return {
    receiptId, versionId,
    correctCount: Number(data.correct_count), questionCount: Number(data.question_count),
    questions: data.questions.map((q: any) => ({ id: Number(q.id), answer: norm(q.answer), correct: norm(q.correct), explication: q.explication ?? null })),
  };
}

/** Wrong questions of THIS submitted passage, in original order. Questions without a known key are never "wrong". */
export function questionsFausses(c: Correction): number[] {
  return c.questions.filter(q => q.correct.length > 0 && !reponseExacte(q.answer, q.correct)).map(q => q.id);
}
