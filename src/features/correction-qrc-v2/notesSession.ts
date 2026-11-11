import { supabase } from '@/integrations/supabase/client';
import { loadSavedExamens } from '@/components/cours-en-ligne/ExamensBlancsEditor';
import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { computeMoyenneExamen, computeMatiereScoreForAttempt } from '@/components/cours-en-ligne/examens-blancs-scoring';
import { findScoreForMatiere, buildMatiereLookupKeys } from '@/components/cours-en-ligne/examens-blancs-utils';
import { isExamAttemptPublicationPending } from '@/components/cours-en-ligne/exam-helpers';
import { fetchCoreMatiereStatesBulk } from '@/lib/coreExamPublication';
import { fetchPassagesV2NonFiables } from '@/lib/passagesV2NonFiables';
import { attacherSourceUnique, noteExamenAffichee } from '@/lib/noteExamenAffichee';
import { lignesExamenAffichees } from '@/lib/ebLignesAffichees';
import { lireCopiesParCurseur, lirePagesParalleles } from './noyauReel';

export type NoteSession = { etat:'non_passe'|'attente'|'incomplet'|'indisponible'|'definitif'; note:number|null; verdict?:string; couverture?:string };
export type InscritNotes = {id:string;nom:string;prenom:string;type_apprenant:string|null;abandonnee?:boolean};
export function filiereInscrit(type:string|null):ExamenBlanc['type']|null {
  const t=(type??'').trim().toLowerCase().replace(/-e$/,'');
  return ({vtc:'VTC',taxi:'TAXI',ta:'TA',va:'VA'} as const)[t as 'vtc'|'taxi'|'ta'|'va']??null;
}
export function noteGeneraleSession(def:ExamenBlanc|undefined,rows:any[],indisponible=false):NoteSession {
  if(indisponible||!def)return {etat:'indisponible',note:null};
  if(!rows.length)return {etat:'non_passe',note:null};
  const scores=rows.map(r=>({...r,lookupKeys:buildMatiereLookupKeys(r.matiere_id,r.matiere_nom)}));
  if(rows.some(r=>noteExamenAffichee(r).etat==='lecture_impossible'))return {etat:'indisponible',note:null};
  if(isExamAttemptPublicationPending(rows,def)||rows.some(r=>noteExamenAffichee(r).etat!=='note'))return {etat:'attente',note:null};
  const bilan=computeMoyenneExamen(def,m=>{const r=findScoreForMatiere(scores,m);return r?computeMatiereScoreForAttempt(m,r):null;});
  if(!bilan.hasScores||bilan.matieresPassees!==bilan.matieresTotal)return {etat:'incomplet',note:null,couverture:`${bilan.matieresPassees}/${bilan.matieresTotal}`};
  return {etat:'definitif',note:bilan.moyenne,verdict:bilan.verdict};
}
export type ReleveSession={inscrits:InscritNotes[];notes:Record<string,Record<number,NoteSession>>;erreur:string|null};
export async function lireInscritsSession(sessionId:string):Promise<InscritNotes[]> {
  const links=await lirePagesParalleles<any>(de=>supabase.from('session_apprenants').select('id,apprenant_id,apprenants(id,nom,prenom,type_apprenant,abandonnee)').eq('session_id',sessionId).order('id').range(de,de+999) as any,1);
  const unique=new Map<string,InscritNotes>();
  for(const l of links){if(!l.apprenants)throw new Error('Lecture des inscrits indisponible');unique.set(l.apprenant_id,l.apprenants);}
  return [...unique.values()].sort((a,b)=>`${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`,'fr'));
}
export async function chargerNotesSession(sessionId:string):Promise<ReleveSession> {
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Session administrateur requise');
  const role=await supabase.rpc('has_role',{_user_id:data.session.user.id,_role:'admin'});if(role.error||role.data!==true)throw new Error('Accès administrateur requis');
  const inscrits=await lireInscritsSession(sessionId);const notes:ReleveSession['notes']={};
  try {
    const ids=inscrits.map(a=>a.id);const definitions=await loadSavedExamens(false,undefined,true);
    const rows:any[]=[];const resets:any[]=[];
    for(let i=0;i<ids.length;i+=100){const lot=ids.slice(i,i+100);
      rows.push(...await lireCopiesParCurseur<any>('id',cursor=>{let q=supabase.from('apprenant_quiz_results').select('*').in('apprenant_id',lot).in('quiz_type',['examen_blanc','examen_blanc_taxi']).order('id').limit(100);if(cursor)q=q.gt('id',cursor);return q as any;}));
      resets.push(...await lirePagesParalleles<any>(de=>supabase.from('core_exam_resets').select('reset_id,apprenant_id,exam_id,cutoff_at,archived_legacy_result_ids').in('apprenant_id',lot).order('reset_id').range(de,de+999) as any,1));
    }
    const core=await fetchCoreMatiereStatesBulk(ids);const preuves=core===null?null:await fetchPassagesV2NonFiables(core);
    if(core===null||preuves===null)throw new Error('Lecture des publications officielles indisponible');
    for(const a of inscrits){const track=filiereInscrit(a.type_apprenant);const reset=resets.filter(r=>r.apprenant_id===a.id);const archived=new Set(reset.flatMap(r=>r.archived_legacy_result_ids??[]));
      const selected=lignesExamenAffichees(rows.filter(r=>r.apprenant_id===a.id&&!archived.has(r.id)),reset).map(r=>attacherSourceUnique(r,core.get(a.id)??[],preuves));
      notes[a.id]={};for(let n=1;n<=6;n++){const def=definitions.find(d=>d.numero===n&&d.type===track);const examRows=selected.filter(r=>r.quiz_id===def?.id);const sansFiche=examRows.length===0&&(core.get(a.id)??[]).some(s=>s.examId===def?.id);notes[a.id][n]=noteGeneraleSession(def,examRows,sansFiche);}
    }
    return {inscrits,notes,erreur:null};
  }catch(e){for(const a of inscrits){notes[a.id]={};for(let n=1;n<=6;n++)notes[a.id][n]={etat:'indisponible',note:null};}return {inscrits,notes,erreur:e instanceof Error?e.message:'Lecture indisponible'};}
}