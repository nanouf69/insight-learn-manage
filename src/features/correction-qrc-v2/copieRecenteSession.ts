import type { CoreMatiereState } from '@/lib/coreExamPublication';
import { CORE_LECTURE_IMPOSSIBLE } from '@/lib/noteExamenAffichee';
import { nativeResultMatchesAnswers, nativeSnapshotSupportsResult } from '@/lib/nativeExamResultIdentity';
import { buildMatiereLookupKeys, findScoreForMatiere } from '@/components/cours-en-ligne/examens-blancs-utils';

/** Read-only projection of an actual submitted attempt, never a linkage to legacy answers. */
export function copieRecenteSession<T extends Record<string, any>>(row:T,states:CoreMatiereState[],nonFiables:Set<string>):T {
  const candidates=states.filter(s=>!s.neutralise&&s.examId===String(row.quiz_id)&&s.matiereId===String(row.matiere_id)
    &&(!s.apprenantId||s.apprenantId===String(row.apprenant_id))&&Number.isFinite(Date.parse(s.finishedAt)));
  const latest=[...candidates].sort((a,b)=>Date.parse(b.finishedAt)-Date.parse(a.finishedAt)||b.attemptId.localeCompare(a.attemptId))[0];
  if(!latest)return row;
  // A later legacy submission must not be replaced by an older native attempt.
  const legacyEnd=Date.parse(String(row.completed_at));
  // A result receipt is written AFTER submission. Its timestamp alone cannot
  // establish a later copy when its complete frozen answers match this attempt.
  // This only selects the attempt; it never creates a legacy/native linkage.
  const receiptMatchesLatest=!latest.resultId&&nativeSnapshotSupportsResult(latest.questions)
    &&nativeResultMatchesAnswers(latest,row.__preuveOriginaleDetails??row.details);
  if(Number.isFinite(legacyEnd)&&legacyEnd>Date.parse(latest.finishedAt)&&!receiptMatchesLatest)return row;
  const impossible=nonFiables.has(latest.attemptId)||(!latest.pending&&(latest.status!=='definitif'||latest.note20===null||!Number.isFinite(latest.note20)));
  return {...row,
    id:latest.resultId??latest.provenResultIds?.[0]??latest.attemptId,
    completed_at:latest.finishedAt,tentative:latest.tentative,
    // Never attach old row answers, corrections or barème to the selected attempt.
    details:latest.historicalDetails??{reponses:latest.answers,snapshot:{questions:latest.questions}},
    __core:impossible?CORE_LECTURE_IMPOSSIBLE:latest,
    __noteRecalculee:false,__doublonConcordant:undefined,__copieSessionAttemptId:latest.attemptId,
  };
}

/** Add only an exact, server-owned submitted subject absent from legacy receipts.
 * This is a display row keyed by attempt ID, not a new result or inferred linkage. */
export function ajouterCopiesNativesSession(rows:Record<string,any>[],states:CoreMatiereState[],nonFiables:Set<string>,apprenantId:string,definitions:Array<{id:string;matieres:Array<{id:string;nom:string}>}>):Record<string,any>[] {
  const out=[...rows];
  for(const def of definitions) for(const subject of def.matieres) {
    const examRows=out.filter(r=>r.quiz_id===def.id&&r.apprenant_id===apprenantId);
    const existing=findScoreForMatiere(examRows.map(r=>({...r,lookupKeys:buildMatiereLookupKeys(r.matiere_id,r.matiere_nom)})),subject);
    if(existing)continue;
    const candidates=states.filter(s=>s.apprenantId===apprenantId&&!s.neutralise&&s.examId===def.id&&s.matiereId===subject.id&&Number.isFinite(Date.parse(s.finishedAt)));
    const latest=[...candidates].sort((a,b)=>Date.parse(b.finishedAt)-Date.parse(a.finishedAt)||b.attemptId.localeCompare(a.attemptId))[0];
    if(!latest)continue;
    const native=latest.resultId==null;
    // Incomplete identity/content remains unavailable, never non-passed or zero.
    const proven=native&&nativeSnapshotSupportsResult(latest.questions)&&Array.isArray(latest.questions)
      &&new Set(latest.questions.map(q=>q.id)).size===latest.questions.length
      &&latest.questions.every(q=>typeof q.id==='string'&&q.id.startsWith(`${subject.id}:`))
      &&latest.answers!==undefined&&Object.keys(latest.answers).every(id=>latest.questions?.some(q=>q.id===id))
      &&(latest.qrcTotal===0||latest.qrcProofs?.length===latest.qrcTotal);
    const rejected=new Set(nonFiables);if(!proven)rejected.add(latest.attemptId);
    const seed={id:latest.attemptId,apprenant_id:apprenantId,quiz_id:def.id,quiz_type:'examen_blanc',matiere_id:subject.id,matiere_nom:subject.nom,completed_at:latest.finishedAt,details:{},__projectionNativeSansFiche:true};
    out.push(copieRecenteSession(seed,[latest],rejected));
  }
  return out;
}