import type { CoreMatiereState } from './coreExamPublication';
import type { ResultatMatiere, Reponses } from '@/components/cours-en-ligne/examens-blancs-types';
import { examAttemptAnswers } from './examAttemptAnswers';

/** Separate practice projection: never modifies the displayed historical score. */
export function ebRevisionSource(result: ResultatMatiere, exam: string, owner: string, states: CoreMatiereState[]): ResultatMatiere {
  const candidates = states.filter(s => !s.neutralise && s.apprenantId === owner && s.examId === exam
    && s.matiereId === result.matiereId && Number.isFinite(Date.parse(s.finishedAt)));
  const latest = candidates.sort((a,b) => Date.parse(b.finishedAt)-Date.parse(a.finishedAt) || b.attemptId.localeCompare(a.attemptId))[0];
  if (!latest) return result;
  // Do not choose a native attempt for a genuinely later legacy submission.
  // Without immutable linkage this is a review, not a guessed merge.
  const legacyEnd = Date.parse(result.completedAt ?? '');
  if (Number.isFinite(legacyEnd) && legacyEnd > Date.parse(latest.finishedAt)
    && !latest.provenResultIds?.includes(result.resultId ?? '') && latest.resultId !== result.resultId) {
    throw new Error('La dernière copie et son résultat ne sont pas reliés avec certitude ; revue manuelle requise.');
  }
  const questions = latest.questions ?? [];
  const rows = Object.entries(latest.answers ?? {}).map(([question_id,valeur]) => ({question_id,valeur}));
  const answers = examAttemptAnswers(result.matiereId, questions.map(q => String(q.id)), rows) as Reponses;
  return {...result, resultId: latest.resultId ?? latest.provenResultIds?.[0] ?? latest.attemptId,
    completedAt: latest.finishedAt, reponses: answers, correctionsIA: undefined,
    details: {reponses: answers}, __core: latest};
}