import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { computeMoyenneExamen } from '@/components/cours-en-ligne/examens-blancs-scoring';
import { buildMatiereLookupKeys, findScoreForMatiere } from '@/components/cours-en-ligne/examens-blancs-utils';
import { noteExamenAffichee, verdictMatiereAffiche } from './noteExamenAffichee';
import { isExamAttemptPublicationPending } from '@/components/cours-en-ligne/exam-helpers';
import { libelleAttenteEB } from './ebCanonicalStatus';

export interface MatiereNoteOfficielle { id:string; nom:string; coefficient:number|null; note:number|null; date:string|null; statut:string }
export interface ExamenNoteOfficielle { id:string; titre:string; date:string|null; note:number|null; statut:string; matieres:MatiereNoteOfficielle[] }
/** Latest actual submitted receipt per subject; no revision row and no previous definitive fallback. */
export function dernieresCopiesOfficielles(rows:any[],owner:string):any[] {
  const map=new Map<string,any>();
  for(const r of rows){
    if(r.apprenant_id!==owner||!['examen_blanc','examen_blanc_taxi'].includes(r.quiz_type)||!r.matiere_id||!Number.isFinite(Date.parse(r.completed_at)))continue;
    const key=`${r.quiz_id}:${r.matiere_id}`;const old=map.get(key);
    if(!old||Date.parse(r.completed_at)>Date.parse(old.completed_at)||(r.completed_at===old.completed_at&&String(r.id)>String(old.id)))map.set(key,r);
  }
  return [...map.values()];
}
export function modeleExamenOfficiel(def:ExamenBlanc,rows:any[]):ExamenNoteOfficielle {
  const scores=rows.map(r=>({...r,lookupKeys:buildMatiereLookupKeys(r.matiere_id,r.matiere_nom)}));
  const matieres=def.matieres.filter(Boolean).map(m=>{
    const r=findScoreForMatiere(scores,m);const n=r?noteExamenAffichee(r):null;
    const coef=r?.__core?.coefficient??r?.details?.snapshot?.coefficient??m.coefficient;
    const coefficient=typeof coef==='number'&&Number.isFinite(coef)&&coef>0?coef:null;
    const note=n?.etat==='note'&&!isExamAttemptPublicationPending([r])?n.note20:null;
    return {id:m.id,nom:m.nom,coefficient,note,date:r?.completed_at??null,statut:!r?'Non réalisé':note==null?libelleAttenteEB([r]):verdictMatiereAffiche(r)===true?'Réussi':verdictMatiereAffiche(r)===false?'À revoir':'Définitive'};
  });
  const dated=matieres.map(m=>m.date).filter((d):d is string=>!!d&&Number.isFinite(Date.parse(d))).sort((a,b)=>Date.parse(b)-Date.parse(a));
  const complete=matieres.length>0&&matieres.every(m=>m.note!=null&&m.coefficient!=null);
  const weighted=complete?computeMoyenneExamen({...def,matieres:def.matieres.map(m=>({...m,coefficient:matieres.find(v=>v.id===m.id)?.coefficient??m.coefficient}))},m=>{
    const n=matieres.find(v=>v.id===m.id);const r=findScoreForMatiere(scores,m);
    if(n?.note==null)return null;
    const verdict=verdictMatiereAffiche(r);
    return {scoreObtenu:n.note,scoreMax:20,noteSur20:n.note,admis:verdict===true,passee:true,seuilInconnu:verdict==null};
  }):null;
  return {id:def.id,titre:`EB${def.numero}`,date:dated[0]??null,note:weighted?.moyenne??null,statut:!dated.length?'Non réalisé':!complete?'Note en attente':weighted?.verdict==='reussi'?'Réussi':weighted?.verdict==='echoue'?'À revoir':'Verdict à vérifier',matieres};
}