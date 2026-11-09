// Preparation only: no application import, transport, writes or grading capability.
export interface HistoricalEb2Row {
  id: string;
  apprenant_id: string;
  quiz_id: string;
  matiere_id: string;
  tentative: number;
  completed_at: string | null;
  details: {
    reponses?: Record<string, unknown>;
    snapshot?: { questions?: HistoricalQuestion[] };
    questions?: HistoricalQuestion[];
  };
}
interface HistoricalQuestion {
  id: string | number;
  type: string;
  enonce?: string;
  reponseQRC?: string;
  points?: number;
}
export interface SubmissionEvidence {
  apprenant_id: string;
  exercice_id: string;
  tentative: number;
  completed: boolean;
  status: string;
  submitted_at: string | null;
  reponses: Record<string, unknown>;
}
function exactJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => exactJson(v, b[i]));
  }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(k => Object.prototype.hasOwnProperty.call(right, k) && exactJson(left[k], right[k]));
}
export function projectEb2ReadOnly(rows: HistoricalEb2Row[], submissions: SubmissionEvidence[], enrolled: Set<string>) {
  return rows.filter(r => r.quiz_id === 'EB2' && enrolled.has(r.apprenant_id)).flatMap(r => {
    const exerciseId = `EB2__${r.matiere_id}${r.tentative === 1 ? '' : `__t${r.tentative}`}`;
    const submitted = submissions.some(s => s.apprenant_id === r.apprenant_id && s.exercice_id === exerciseId
      && s.tentative === r.tentative && s.completed && s.status === 'submitted' && s.submitted_at !== null
      && exactJson(s.reponses, r.details.reponses));
    const questions = r.details.snapshot?.questions ?? r.details.questions ?? [];
    return questions.filter(q => q.type.toUpperCase() === 'QRC').map(q => ({
      identity: `history:${r.id}:${q.id}`,
      sourceResultId: r.id,
      apprenantId: r.apprenant_id,
      examId: r.quiz_id,
      matiereId: r.matiere_id,
      tentative: r.tentative,
      questionId: String(q.id),
      enonce: q.enonce ?? null,
      reponseOfficielle: q.reponseQRC ?? null,
      bareme: q.points ?? null,
      reponse: r.details.reponses?.[String(q.id)] ?? null,
      completedAt: r.completed_at,
      submissionState: submitted ? 'submitted_exact' : 'submission_unverified',
      // A result timestamp alone never proves a submission or enables grading.
      readOnly: true as const,
      canGrade: false as const,
    }));
  });
}
export async function readAllPages<T>(read: (from: number, to: number) => Promise<T[]>, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await read(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}