import { supabase } from '@/integrations/supabase/client';
import { MODULES_DATA } from '@/components/cours-en-ligne/formations-data';
import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { baremeReference, moyenneBilan, noterMatiere } from './bilanFutureBareme';
import type { ExamenNoteOfficielle } from './notesOfficiellesEleve';
export type SourcesBilansNotes={future:any[];archives:any[]};
/** Display threshold only: does not change official grades or passing verdicts. */
export function matieresBilanARevoir(bilans:ExamenNoteOfficielle[]){
 return bilans.flatMap(b=>b.matieres.filter(m=>typeof m.note==='number'&&Number.isFinite(m.note)&&m.note>=0&&m.note<16).map(m=>({bilanId:b.id,bilan:b.titre,...m,pourcentage:(m.note??0)*5})));
}
export async function lireBilansNotes(apprenantId:string,ownerId:string|null):Promise<SourcesBilansNotes>{
 const archives:any[]=[];const future:any[]=[];
 for(let start=0;;start+=100){
  const {data,error}=await supabase.from('bilan_passages_figes').select('id,module_id,exercice_id,tentative,passage_updated_at,score_bonnes,nb_questions,statut_passage').eq('apprenant_id',apprenantId).in('module_id',[5,11,28,30]).order('id').range(start,start+99);
  if(error)throw new Error('Lecture des Bilans enregistrés impossible');archives.push(...data??[]);if(!data||data.length<100)break;
 }
 if(ownerId)for(let start=0;;start+=100){
  const {data,error}=await (supabase.from('bilan_future_receipts') as any).select('id,module_id,exercise_id,version_id,bilan_future_submissions(correct_count,question_count,submitted_at)').eq('owner_id',ownerId).order('id').range(start,start+99);
  if(error)throw new Error('Lecture des nouveaux Bilans impossible');future.push(...data??[]);if(!data||data.length<100)break;
 }
 return {future,archives};
}
/** Future A–E uses its existing EB1 barème. Legacy unknown overall weighting stays pending. */
export function modelesBilansNotes(s:SourcesBilansNotes,defs:ExamenBlanc[]):ExamenNoteOfficielle[]{
 const out:ExamenNoteOfficielle[]=[];
 for(const module of [5,11] as const){
  const rows=s.future.filter(r=>r.module_id===module);const submitted=rows.filter(r=>r.bilan_future_submissions?.length||r.bilan_future_submissions?.submitted_at);
  if(!submitted.length)continue;
  const bareme=baremeReference(defs,module);
  const notes=bareme?.map((b,i)=>{const r=rows.find(r=>r.exercise_id===(module===5?500:600)+i);const sub=Array.isArray(r?.bilan_future_submissions)?r.bilan_future_submissions[0]:r?.bilan_future_submissions;return sub&&Number(sub.question_count)>0&&Number(sub.correct_count)>=0&&Number(sub.correct_count)<=Number(sub.question_count)?noterMatiere(b,Number(sub.correct_count),Number(sub.question_count)):null;});
  const total=bareme&&notes&&notes.every(Boolean)?moyenneBilan(bareme,notes):null;
  const dates=submitted.map(r=>{const sub=Array.isArray(r.bilan_future_submissions)?r.bilan_future_submissions[0]:r.bilan_future_submissions;return sub.submitted_at;}).filter(d=>Number.isFinite(Date.parse(d))).sort((a,b)=>Date.parse(b)-Date.parse(a));
  out.push({id:`future-${module}`,titre:`Bilan ${module===5?'VTC':'TAXI'} · A–E`,note:total?.moyenne??null,date:dates[0]??null,statut:!total?'Note en attente':total.verdict==='reussi'?'Réussi':total.verdict==='echoue'?'À revoir':'Verdict à vérifier',matieres:bareme?.map((b,i)=>({id:b.matiere.id,nom:b.matiere.nom,coefficient:b.coefficient,note:notes?.[i]?.noteSur20??null,date:null,statut:notes?.[i]?'Remise enregistrée':'Non réalisé'}))??[]});
 }
 const groups=new Map<string,any[]>();
 for(const r of s.archives){if(r.statut_passage!=='submitted')continue;const key=`${r.module_id}:${r.tentative}`;groups.set(key,[...groups.get(key)??[],r]);}
 for(const [key,rows] of groups){
  const module=rows[0].module_id;const dates=rows.map(r=>r.passage_updated_at).filter(d=>Number.isFinite(Date.parse(d))).sort((a,b)=>Date.parse(b)-Date.parse(a));
  out.push({id:`archive-${key}`,titre:`${MODULES_DATA.find(m=>m.id===module)?.nom??'Bilan examen'} · tentative ${rows[0].tentative??'non précisée'}`,note:null,date:dates[0]??null,statut:'Note en attente',matieres:rows.map(r=>({id:String(r.exercice_id),nom:`Exercice enregistré ${r.exercice_id}`,coefficient:null,note:null,date:r.passage_updated_at,statut:'Barème historique non vérifié — copie conservée'}))});
 }
 return out.sort((a,b)=>Date.parse(a.date??'')-Date.parse(b.date??'')||a.id.localeCompare(b.id));
}