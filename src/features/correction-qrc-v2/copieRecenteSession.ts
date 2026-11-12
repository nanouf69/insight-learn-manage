import type { CoreMatiereState } from '@/lib/coreExamPublication';
import { CORE_LECTURE_IMPOSSIBLE } from '@/lib/noteExamenAffichee';

/** Read-only projection of an actual submitted attempt, never a linkage to legacy answers. */
export function copieRecenteSession<T extends Record<string, any>>(row:T,states:CoreMatiereState[],nonFiables:Set<string>):T {
  const candidates=states.filter(s=>!s.neutralise&&s.examId===String(row.quiz_id)&&s.matiereId===String(row.matiere_id)
    &&(!s.apprenantId||s.apprenantId===String(row.apprenant_id))&&Number.isFinite(Date.parse(s.finishedAt)));
  const latest=[...candidates].sort((a,b)=>Date.parse(b.finishedAt)-Date.parse(a.finishedAt)||b.attemptId.localeCompare(a.attemptId))[0];
  if(!latest)return row;
  // A later legacy submission must not be replaced by an older native attempt.
  const legacyEnd=Date.parse(String(row.completed_at));
  if(Number.isFinite(legacyEnd)&&legacyEnd>Date.parse(latest.finishedAt))return row;
  const impossible=nonFiables.has(latest.attemptId)||(!latest.pending&&(latest.status!=='definitif'||latest.note20===null||!Number.isFinite(latest.note20)));
  return {...row,
    id:latest.resultId??latest.provenResultIds?.[0]??latest.attemptId,
    completed_at:latest.finishedAt,tentative:latest.tentative,
    // Never attach old row answers, corrections or barème to the selected attempt.
    details:latest.historicalDetails??{reponses:latest.answers,snapshot:{questions:latest.questions}},
    __core:impossible?CORE_LECTURE_IMPOSSIBLE:latest,
    __noteRecalculee:false,__doublonConcordant:undefined,
  };
}