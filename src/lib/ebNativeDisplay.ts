import type { CoreMatiereState } from './coreExamPublication';
import { copieRecenteSession, ajouterCopiesNativesSession } from '@/features/correction-qrc-v2/copieRecenteSession';
import { nativeResultMatchesAnswers, nativeSnapshotSupportsResult } from './nativeExamResultIdentity';
import { parseExamAnswerKey } from '@/components/cours-en-ligne/examens-blancs-utils';
import { CORE_LECTURE_IMPOSSIBLE, attacherSourceUnique } from './noteExamenAffichee';
import { statutCopieEB } from './ebCanonicalStatus';

/** Select an independent submitted copy, never manufacture a legacy/native link. */
export function lignesNativesAffichees(rows: any[], states: CoreMatiereState[] | null, rejected: Set<string> | null, owner: string, definitions: Array<{ id: string; matieres: Array<{ id: string; nom: string }> }>) {
  if (!states || !rejected) return rows;
  const scoped = states.filter(s => s.apprenantId === owner && !s.neutralise && Number.isFinite(Date.parse(s.finishedAt)));
  const selected = rows.filter(r => r.apprenant_id === owner).map(row => copieRecenteSession(row, scoped, rejected));
  return ajouterCopiesNativesSession(selected, scoped, rejected, owner, definitions).map(row => {
    const core = row.__core as CoreMatiereState | undefined;
    if (!row.__copieSessionAttemptId || !core?.attemptId || core.resultId || !nativeSnapshotSupportsResult(core.questions)) return row;
    const prefix = `${core.matiereId}:`;
    const answers = Object.fromEntries(Object.entries(core.answers ?? {}).map(([id, value]) => [id.startsWith(prefix) ? id.slice(prefix.length) : id, value]));
    const questions = core.questions?.map(q => ({ ...q, id: String(q.id).slice(prefix.length), questionId: String(q.id).slice(prefix.length) }));
    return { ...row, details: { reponses: answers, snapshot: { questions, coefficient: core.coefficient, noteSur: core.noteSur, noteEliminatoire: core.noteEliminatoire } }, __core: core };
  });
}

/** One current display row per exact subject, while divergent receipts remain diagnostic evidence.
 * Callers supply server-filtered active states/receipts; no inferred attempt number or linkage. */
export function lignesCanoniquesEB(rows: any[], states: CoreMatiereState[] | null, rejected: Set<string> | null, owner: string,
  definitions: Array<{ id: string; matieres: Array<{ id: string; nom: string }> }>): any[] {
  if (!states || !rejected) return rows.filter(r => r.apprenant_id === owner).map(r => ({ ...r, __core: CORE_LECTURE_IMPOSSIBLE }));
  const scoped = states.filter(s => s.apprenantId === owner && !s.neutralise && Number.isFinite(Date.parse(s.finishedAt)));
  const out: any[] = [];
  for (const def of definitions) for (const m of def.matieres) {
    const receipts = rows.filter(r => r.apprenant_id === owner && r.quiz_id === def.id && r.matiere_id === m.id && Number.isFinite(Date.parse(r.completed_at)))
      .sort((a,b) => Date.parse(b.completed_at)-Date.parse(a.completed_at)||String(b.id).localeCompare(String(a.id)));
    const latest = scoped.filter(s => s.examId === def.id && s.matiereId === m.id)
      .sort((a,b) => Date.parse(b.finishedAt)-Date.parse(a.finishedAt)||b.attemptId.localeCompare(a.attemptId))[0];
    if (!latest) { if(receipts[0]) out.push(attacherSourceUnique(receipts[0],scoped,rejected)); continue; }
    const seed = { id: latest.attemptId, apprenant_id: owner, quiz_id: def.id, quiz_type: 'examen_blanc', quiz_titre: def.id,
      matiere_id: m.id, matiere_nom: m.nom, completed_at: latest.finishedAt, details: {} };
    // Select the independent native copy even when a secondary receipt is missing or ambiguous.
    const projected = latest.resultId ? copieRecenteSession(seed,[latest],rejected)
      : lignesNativesAffichees([], [latest], rejected, owner, [def]).find(r => r.matiere_id === m.id) ?? copieRecenteSession(seed,[latest],rejected);
    const laterDivergent = receipts.find(r => Date.parse(r.completed_at)>Date.parse(latest.finishedAt)
      && r.id!==latest.resultId && !latest.provenResultIds?.includes(String(r.id)) && !nativeResultMatchesAnswers(latest,r.__preuveOriginaleDetails??r.details));
    const status = rejected.has(latest.attemptId) ? 'revue' : statutCopieEB(latest);
    out.push({ ...projected, __statutCopieEB: status,
      __revueProvenance: laterDivergent ? 'Reçu ultérieur distinct — liaison non prouvée' : undefined,
      __recusDistincts: laterDivergent ? receipts.map(r=>String(r.id)) : undefined,
      __core: status==='revue' ? { ...CORE_LECTURE_IMPOSSIBLE, attemptId:latest.attemptId } : projected.__core,
    });
  }
  return out;
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