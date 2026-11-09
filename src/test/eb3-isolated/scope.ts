// TEST ONLY: mirrors the proposed server decision. Not an authorization mechanism.
export const prospectiveExamIds = ['EB3', 'EB4', 'EB5', 'EB6', 'EB3-TAXI', 'EB4-TAXI', 'EB5-TAXI', 'EB6-TAXI'] as const;
export type OriginalSource = {
  examId: string; learnerId: string; subjectId: string; attemptId: string;
  startedAt: string; snapshotFingerprint: string; snapshotSubjectId: string;
  questions: unknown; isTest: boolean;
};
export function prospectiveScope(examId: string, learnerId: string, activatedAt: string | null, sources: OriginalSource[]): boolean {
  if (!prospectiveExamIds.some(id => id === examId) || !activatedAt) return false;
  const activation = Date.parse(activatedAt);
  if (!Number.isFinite(activation) || sources.length !== 7 || new Set(sources.map(s => s.subjectId)).size !== 7 || new Set(sources.map(s => s.attemptId)).size !== 7) return false;
  return sources.every(s => s.examId === examId && s.learnerId === learnerId && s.startedAt !== '' && Date.parse(s.startedAt) > activation && !s.isTest && s.snapshotFingerprint.trim() !== '' && s.snapshotSubjectId === s.subjectId && Array.isArray(s.questions) && s.questions.length > 0);
}