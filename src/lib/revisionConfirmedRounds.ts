import { revisionQuestionKey, restaurerRevisionProgressState, type RevisionQuestionIdentity } from './revisionFaussesProgression';
import { nouvelleTentativeRevision, revisionBaseId } from './revisionFaussesTentative';

export interface ConfirmedRevisionRound {
  id?: string;
  exercice_id: string;
  completed: boolean | null;
  reponses?: unknown;
  write_seq?: number | null;
}

/** Server rows only. Never infer source identity from round number, timestamps or question order. */
export function selectConfirmedRevisionRounds(exam: string, rows: ConfirmedRevisionRound[], items: RevisionQuestionIdentity[], finished: Set<string>) {
  const base = revisionBaseId(exam);
  const number = (id: string) => id === base ? 1 : id.startsWith(`${base}__r`) && /^[1-9]\d*$/.test(id.slice(base.length + 3)) ? Number(id.slice(base.length + 3)) : null;
  const order = items.map(revisionQuestionKey);
  const parsed = rows.flatMap(row => {
    const round = number(row.exercice_id);
    if (round === null) return [];
    const state = restaurerRevisionProgressState(row.reponses, exam, order);
    return [{row, round, state}];
  });
  // Two physical rows for one immutable round cannot be ordered by timestamps.
  if (new Set(parsed.map(x => x.row.exercice_id)).size !== parsed.length) throw new Error('Plusieurs sources serveur pour la même révision ; revue requise.');
  const rootExam = (row: ConfirmedRevisionRound) => (row.reponses as {revisionState?: {examenId?: string}} | null)?.revisionState?.examenId;
  const compatible = parsed.filter(x => rootExam(x.row) === exam && items.every(item => {
    const key = revisionQuestionKey(item);
    return item.sourceResultId ? x.state.sourceResultIds?.[key] === item.sourceResultId : !x.state.sourceResultIds?.[key];
  }));
  const latest = compatible.sort((a,b) => b.round-a.round)[0];
  const selected = latest && (latest.row.completed !== true || !finished.has(latest.row.exercice_id)) ? latest : undefined;
  const answers: Record<string, unknown> = {};
  const origins: Record<string, {round: string; writeSeq: number | null}> = {};
  // A later partial round overrides only questions it actually contains; never copies validation markers.
  for (const item of items) {
    const key = revisionQuestionKey(item);
    const candidate = parsed.filter(x => rootExam(x.row) === exam && (item.sourceResultId
      ? x.state.sourceResultIds?.[key] === item.sourceResultId : !x.state.sourceResultIds?.[key]))
      .sort((a,b) => b.round-a.round).find(x => Object.prototype.hasOwnProperty.call(x.state.answers,key));
    if (candidate) { answers[key] = candidate.state.answers[key]; origins[key] = {round:candidate.row.exercice_id,writeSeq:candidate.row.write_seq ?? null}; }
  }
  return {exerciseId:selected?.row.exercice_id ?? nouvelleTentativeRevision(base, rows), selected:selected?.row,
    answers, origins, preserved:parsed.length-compatible.length};
}