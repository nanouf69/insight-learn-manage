export type ExamResetRow = {
  exam_id?: string | null;
  cutoff_at?: string | null;
};

export function latestExamResetCutoffs(rows: ExamResetRow[] | null | undefined): Record<string, number> {
  const cutoffs: Record<string, number> = {};
  for (const row of rows ?? []) {
    const examId = String(row?.exam_id ?? "");
    const cutoff = new Date(row?.cutoff_at ?? 0).getTime();
    if (examId && Number.isFinite(cutoff) && cutoff > (cutoffs[examId] ?? 0)) cutoffs[examId] = cutoff;
  }
  return cutoffs;
}

export function isAfterExamReset(value: unknown, cutoff: number | null | undefined): boolean {
  if (!cutoff) return true;
  const timestamp = new Date(String(value ?? "")).getTime();
  return Number.isFinite(timestamp) && timestamp > cutoff;
}