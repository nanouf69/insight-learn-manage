import type { CoreMatiereState } from '@/lib/coreExamPublication';
import { lignesCanoniquesEB, brouillonDejaRemis } from '@/lib/ebNativeDisplay';
import { statutCopieEB } from '@/lib/ebCanonicalStatus';

export const TYPES_COHERENCE_EB = {
  recu_absent: 'Copie remise sans reçu secondaire', recu_perime: 'Reçu secondaire périmé',
  provenance: 'Provenance à vérifier', publication: 'QRC corrigées, publication à vérifier',
  compteur: 'Compteur QRC divergent', snapshot: 'Preuve figée insuffisante', reprise: 'Sauvegarde ancienne déjà remise',
} as const;
export type AlerteCoherenceEB = { cle:string; type:keyof typeof TYPES_COHERENCE_EB; apprenantId:string; nom:string; examen:string; matiere:string; attemptId:string; date:string; note:number|null };
export type RapportCoherenceEB = { controle:string; candidats:number; copies:number; alertes:AlerteCoherenceEB[]; signature:string };
/** Diagnostic output contains no answers, questions, comments, emails or credentials. */
export function observerCoherenceEB(p:{owner:string;nom:string;rows:any[];states:CoreMatiereState[];drafts:any[];definitions:Array<{id:string;matieres:Array<{id:string;nom:string}>}>;rejected:Set<string>}):AlerteCoherenceEB[] {
  const selected=lignesCanoniquesEB(p.rows,p.states,p.rejected,p.owner,p.definitions);
  const out:AlerteCoherenceEB[]=[];
  const push=(type:AlerteCoherenceEB['type'],s:CoreMatiereState)=>out.push({cle:`${p.owner}:${s.attemptId}:${type}`,type,apprenantId:p.owner,nom:p.nom,examen:s.examId,matiere:s.matiereId,attemptId:s.attemptId,date:s.finishedAt,note:statutCopieEB(s)==='definitif'?s.note20:null});
  for(const row of selected){
    const s=p.states.find(s=>s.attemptId===row.__copieSessionAttemptId);if(!s)continue;
    const receipts=p.rows.filter(r=>r.apprenant_id===p.owner&&r.quiz_id===s.examId&&r.matiere_id===s.matiereId);
    if(!receipts.length)push('recu_absent',s);
    if(row.__revueProvenance)push('provenance',s);
    if(statutCopieEB(s)==='definitif'&&receipts.some(r=>r.details?.qrc_pending_correction===true))push('recu_perime',s);
    const pending=(s.qrcProofs??[]).filter(q=>q.etat!=='corrigee'||q.note==null).length;
    if(s.qrcRestantes!==pending)push('compteur',s);
    if(statutCopieEB(s)==='publication')push('publication',s);
    if(statutCopieEB(s)==='revue'||p.rejected.has(s.attemptId))push('snapshot',s);
    if(p.drafts.some(d=>d.completed!==true&&brouillonDejaRemis(d,[s],p.owner,s.examId)))push('reprise',s);
  }
  return [...new Map(out.map(a=>[a.cle,a])).values()];
}