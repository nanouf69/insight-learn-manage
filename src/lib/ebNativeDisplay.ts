import type { CoreMatiereState } from './coreExamPublication';
import { copieRecenteSession, ajouterCopiesNativesSession } from '@/features/correction-qrc-v2/copieRecenteSession';
import { nativeResultMatchesAnswers, nativeSnapshotSupportsResult } from './nativeExamResultIdentity';
import { parseExamAnswerKey } from '@/components/cours-en-ligne/examens-blancs-utils';

/** Select an independent submitted copy, never manufacture a legacy/native link. */
export function lignesNativesAffichees(rows: any[], states: CoreMatiereState[] | null, rejected: Set<string> | null, owner: string, definitions: Array<{ id: string; matieres: Array<{ id: string; nom: string }> }>) {
  if (!states || !rejected) return rows;
  const selected = rows.map(row => copieRecenteSession(row, states, rejected));
  return ajouterCopiesNativesSession(selected, states, rejected, owner, definitions).map(row => {
    const core = row.__core as CoreMatiereState | undefined;
    if (!row.__copieSessionAttemptId || !core?.attemptId || core.resultId || !nativeSnapshotSupportsResult(core.questions)) return row;
    const prefix = `${core.matiereId}:`;
    const answers = Object.fromEntries(Object.entries(core.answers ?? {}).map(([id, value]) => [id.startsWith(prefix) ? id.slice(prefix.length) : id, value]));
    const questions = core.questions?.map(q => ({ ...q, id: String(q.id).slice(prefix.length), questionId: String(q.id).slice(prefix.length) }));
    return { ...row, details: { reponses: answers, snapshot: { questions } }, __core: core };
  });
}

/** A leftover autosave is not a resumable attempt when its exact frozen answers were submitted. */
export function brouillonDejaRemis(row: any, states: CoreMatiereState[] | null, owner: string, examId: string): boolean {
  const parsed = parseExamAnswerKey(String(row.exercice_id ?? ''), examId);
  if (!parsed || !states || row.apprenant_id !== owner) return false;
  const update = Date.parse(row.updated_at ?? row.created_at);
  return states.some(s => s.apprenantId === owner && !s.neutralise && !s.resultId && s.examId === examId
    && s.matiereId === parsed.matiereKey && (s.tentative == null ? parsed.tentative === 1 : s.tentative === parsed.tentative)
    && Number.isFinite(update) && update <= Date.parse(s.finishedAt)
    && nativeResultMatchesAnswers(s, { reponses: row.reponses }));
}