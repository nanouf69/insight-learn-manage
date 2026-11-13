import { copieRecenteSession, ajouterCopiesNativesSession } from './copieRecenteSession';
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
import { chargerSessionTest, lireCopiesParCurseur, lirePagesParalleles } from './noyauReel';
import { statutFile } from './fileTravail';
import { deciderRattachementCrm } from './rattachementCrm';
import type { DestinationCorrection } from './lienCorrectionSession';
import { signalerLectureNotes, verifierLectureNotes, type SuiviChargementNotes } from './chargementNotesSession';

export type NoteSession = { etat:'non_passe'|'attente'|'incomplet'|'indisponible'|'definitif'; note:number|null; verdict?:string; couverture?:string; doublon?:boolean };
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
  return {etat:'definitif',note:bilan.moyenne,verdict:bilan.verdict,...(rows.some(r=>r.__doublonConcordant)?{doublon:true}:{})};
}
export type ExamenNotesSession={id:string;numero:number;filiere:ExamenBlanc['type'];matieres:Array<{id:string;nom:string}>};
export type SourceAttente={destinations:DestinationCorrection[];motif?:'publication'|'non_rattachee'|'ambigue'};
export type ReleveSession={inscrits:InscritNotes[];notes:Record<string,Record<number,NoteSession>>;examens?:ExamenNotesSession[];matieres?:Record<string,Record<string,Record<string,NoteSession>>>;sourcesAttente?:Record<string,Record<string,Record<string,SourceAttente>>>;erreur:string|null};
const jourParisIso=(iso:string)=>new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris'}).format(new Date(iso));
const jourFr=(j:string)=>j.split('-').reverse().join('/');
/** Destinations only from the official attached V2 attempt and the CRM decision used by the correction catalogue. */
export function sourceAttenteMatiere(row:any,liens:any[],sessionAffichee:string,typeApprenant:string):SourceAttente{
  const core=row?.__core;
  if(!core?.attemptId||!core.finishedAt)return {destinations:[],motif:'non_rattachee'};
  if(row.__copieSessionAttemptId!==core.attemptId&&core.resultId!==row.id&&!core.provenResultIds?.includes(String(row.id)))return {destinations:[],motif:'non_rattachee'};
  if(/-e$/i.test(typeApprenant))return {destinations:[],motif:'non_rattachee'};
  if(Number(core.qrcRestantes)<=0)return {destinations:[],motif:'publication'};
  const jour=jourParisIso(core.finishedAt);
  const decision=deciderRattachementCrm({jour,examId:String(row.quiz_id),typeApprenant,liens});
  if(decision.type!=='unique'&&decision.type!=='croisee')return {destinations:[],motif:'ambigue'};
  const sessions=decision.sessions.some(l=>`crm:${l.session.id}`===sessionAffichee)?decision.sessions.filter(l=>`crm:${l.session.id}`===sessionAffichee):decision.sessions;
  return {destinations:sessions.map(l=>({sessionCle:`crm:${l.session.id}`,jour,attemptId:core.attemptId,libelle:`${l.session.nom??'Session sans nom'} · ${jourFr(jour)}`,qrcRestantes:Number(core.qrcRestantes)}))};
}
/** Per-subject official display note; other pending subjects cannot hide it. */
export function notesMatieresSession(def:ExamenBlanc,rows:any[],indisponible=false):Record<string,NoteSession>{
  const scores=rows.map(r=>({...r,lookupKeys:buildMatiereLookupKeys(r.matiere_id,r.matiere_nom)}));
  return Object.fromEntries(def.matieres.map(m=>{
    const row=findScoreForMatiere(scores,m);const note=row?noteExamenAffichee(row):null;
    const value:NoteSession=indisponible?{etat:'indisponible',note:null}:!row?{etat:'non_passe',note:null}:note?.etat==='note'?{etat:'definitif',note:note.note20,...((row as any).__doublonConcordant?{doublon:true}:{})}:note?.etat==='lecture_impossible'?{etat:'indisponible',note:null}:{etat:'attente',note:null};
    return [m.id,value];
  }));
}
export function moyenneNotesDefinitives(notes:Array<NoteSession|undefined>,inscrits:number){
  const values=notes.filter((n):n is NoteSession & {note:number}=>n?.etat==='definitif'&&typeof n.note==='number'&&Number.isFinite(n.note));
  return {note:values.length?Math.round(values.reduce((s,n)=>s+n.note,0)/values.length*10)/10:null,n:values.length,inscrits};
}
export function moyenneSessionExamen(releve:ReleveSession,exam:ExamenNotesSession,matiere?:string){
  const concerns=releve.inscrits.filter(a=>filiereInscrit(a.type_apprenant)===exam.filiere);
  return moyenneNotesDefinitives(concerns.map(a=>matiere?releve.matieres?.[a.id]?.[exam.id]?.[matiere]:releve.notes[a.id]?.[exam.numero]),concerns.length);
}
export async function lireInscritsSession(sessionId:string):Promise<InscritNotes[]> {
  const links=await lirePagesParalleles<any>(de=>supabase.from('session_apprenants').select('id,apprenant_id,apprenants(id,nom,prenom,type_apprenant,abandonnee)').eq('session_id',sessionId).order('id').range(de,de+999) as any,1);
  const unique=new Map<string,InscritNotes>();
  for(const l of links){if(!l.apprenants)throw new Error('Lecture des inscrits indisponible');unique.set(l.apprenant_id,l.apprenants);}
  return [...unique.values()].sort((a,b)=>`${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`,'fr'));
}
export async function chargerNotesSession(sessionId:string,suivi?:SuiviChargementNotes):Promise<ReleveSession> {
  signalerLectureNotes(suivi,{etape:'Chargement des candidats'});
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Session administrateur requise');
  const role=await supabase.rpc('has_role',{_user_id:data.session.user.id,_role:'admin'});if(role.error||role.data!==true)throw new Error('Accès administrateur requis');
  const inscrits=await lireInscritsSession(sessionId);const notes:ReleveSession['notes']={};
  signalerLectureNotes(suivi,{etape:'Chargement des candidats',charges:inscrits.length,total:inscrits.length});
  suivi?.partiel?.({inscrits,notes:{},erreur:null});
  let examens:ExamenNotesSession[]=[];const matieres:NonNullable<ReleveSession['matieres']>={};const sourcesAttente:NonNullable<ReleveSession['sourcesAttente']>={};
  try {
    signalerLectureNotes(suivi,{etape:'Récupération des notes'});
    const ids=inscrits.map(a=>a.id);const definitions=await loadSavedExamens(false,undefined,true);
    verifierLectureNotes(suivi);
    const tracks=new Set(inscrits.map(a=>filiereInscrit(a.type_apprenant)));
    examens=definitions.filter(d=>d.numero>=1&&d.numero<=6&&tracks.has(d.type)).map(d=>({id:d.id,numero:d.numero,filiere:d.type,matieres:d.matieres.map(m=>({id:m.id,nom:m.nom}))})).sort((a,b)=>a.numero-b.numero||a.filiere.localeCompare(b.filiere));
    const rows:any[]=[];const resets:any[]=[];const liens:any[]=[];
    for(let i=0;i<ids.length;i+=100){const lot=ids.slice(i,i+100);
      rows.push(...await lireCopiesParCurseur<any>('id',cursor=>{let q=supabase.from('apprenant_quiz_results').select('*').in('apprenant_id',lot).in('quiz_type',['examen_blanc','examen_blanc_taxi']).order('id').limit(100);if(cursor)q=q.gt('id',cursor);return q as any;}));
      resets.push(...await lirePagesParalleles<any>(de=>supabase.from('core_exam_resets').select('reset_id,apprenant_id,exam_id,cutoff_at,archived_legacy_result_ids').in('apprenant_id',lot).order('reset_id').range(de,de+999) as any,1));
      liens.push(...await lirePagesParalleles<any>(de=>supabase.from('session_apprenants').select('id,apprenant_id,date_debut,date_fin,sessions:session_id(id,nom,date_debut,date_fin)').in('apprenant_id',lot).order('id').range(de,de+999) as any,1));
      verifierLectureNotes(suivi);
    }
    const core=await fetchCoreMatiereStatesBulk(ids);
    verifierLectureNotes(suivi);
    const preuves=core===null?null:await fetchPassagesV2NonFiables(core);
    if(core===null||preuves===null)throw new Error('Lecture des publications officielles indisponible');
    signalerLectureNotes(suivi,{etape:'Préparation du tableau',charges:0,total:inscrits.length});
    for(const a of inscrits){const track=filiereInscrit(a.type_apprenant);const reset=resets.filter(r=>r.apprenant_id===a.id);const archived=new Set(reset.flatMap(r=>r.archived_legacy_result_ids??[]));
      const states=(core.get(a.id)??[]).filter(s=>!reset.some(r=>r.exam_id===s.examId&&Date.parse(s.finishedAt)<=Date.parse(r.cutoff_at)));
      const legacySelected=lignesExamenAffichees(rows.filter(r=>r.apprenant_id===a.id&&!archived.has(r.id)),reset).map(r=>copieRecenteSession(attacherSourceUnique(r,states,preuves),states,preuves));
      const selected=ajouterCopiesNativesSession(legacySelected,states,preuves,a.id,definitions.filter(d=>d.type===track));
      const liensApprenant=liens.filter(l=>l.apprenant_id===a.id&&l.sessions).map(l=>({session:l.sessions,debut:String(l.date_debut??l.sessions.date_debut).slice(0,10),fin:String(l.date_fin??l.sessions.date_fin).slice(0,10)}));
      notes[a.id]={};matieres[a.id]={};sourcesAttente[a.id]={};for(let n=1;n<=6;n++){const def=definitions.find(d=>d.numero===n&&d.type===track);const examRows=selected.filter(r=>r.quiz_id===def?.id);const sansFiche=examRows.length===0&&(core.get(a.id)??[]).some(s=>s.examId===def?.id);notes[a.id][n]=noteGeneraleSession(def,examRows,sansFiche);if(def){matieres[a.id][def.id]=notesMatieresSession(def,examRows,sansFiche);sourcesAttente[a.id][def.id]={};const scores=examRows.map(r=>({...r,lookupKeys:buildMatiereLookupKeys(r.matiere_id,r.matiere_nom)}));for(const m of def.matieres){if(matieres[a.id][def.id][m.id]?.etat==='attente')sourcesAttente[a.id][def.id][m.id]=sourceAttenteMatiere(findScoreForMatiere(scores,m),liensApprenant,`crm:${sessionId}`,a.type_apprenant??'');}}}
      signalerLectureNotes(suivi,{etape:'Préparation du tableau',charges:Object.keys(notes).length,total:inscrits.length});
    }
    suivi?.partiel?.({inscrits,notes,examens,matieres,sourcesAttente,erreur:null});
    signalerLectureNotes(suivi,{etape:'Préparation du tableau'});
    const sources=Object.values(sourcesAttente).flatMap(ex=>Object.values(ex).flatMap(ms=>Object.values(ms)));
    const passageIds=[...new Set(sources.flatMap(s=>s.destinations.map(d=>d.attemptId)))];
    const copies=await chargerSessionTest('migre',passageIds);
    verifierLectureNotes(suivi);
    for(const source of sources){
      source.destinations=source.destinations.flatMap(d=>{
        const classes=copies.qrc.filter(q=>q.attempt_id===d.attemptId).map(q=>statutFile(q,copies));
        const vues=(['corriger','valider','verifier'] as const).filter(v=>classes.includes(v));
        return vues.map(vue=>({...d,vue,qrcRestantes:classes.filter(v=>v===vue).length}));
      });
      if(!source.destinations.length&&!source.motif)source.motif='publication';
    }
    return {inscrits,notes,examens,matieres,sourcesAttente,erreur:null};
  }catch(e){verifierLectureNotes(suivi);for(const a of inscrits){notes[a.id]={};matieres[a.id]={};for(let n=1;n<=6;n++)notes[a.id][n]={etat:'indisponible',note:null};for(const exam of examens)matieres[a.id][exam.id]=Object.fromEntries(exam.matieres.map(m=>[m.id,{etat:'indisponible',note:null}]));}return {inscrits,notes,examens,matieres,erreur:e instanceof Error?e.message:'Lecture indisponible'};}
}