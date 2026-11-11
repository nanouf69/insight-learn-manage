import { createRoot } from 'react-dom/client';
import { NotesParSession } from '@/features/correction-qrc-v2/NotesParSession';
import type { ReleveSession, ExamenNotesSession } from '@/features/correction-qrc-v2/notesSession';
import type { GroupeSessionCrm } from '@/features/correction-qrc-v2/noyauReel';
import { absentsSessionJour } from '@/features/correction-qrc-v2/absenceSessionJour';
import '@/index.css';
const examens:ExamenNotesSession[]=['VTC','TAXI','TA','VA'].flatMap(f=>[1,2].map(numero=>({id:`EB${numero}${f==='VTC'?'':`-${f}`}`,numero,filiere:f as ExamenNotesSession['filiere'],matieres:[{id:'a',nom:'Gestion'},{id:'b',nom:'Français'}]})));
const releve:ReleveSession={inscrits:[{id:'a',nom:'ZÉRO',prenom:'Test',type_apprenant:'vtc'},{id:'b',nom:'ATTENTE',prenom:'Test',type_apprenant:'vtc'},{id:'c',nom:'AUTRE',prenom:'Test',type_apprenant:'taxi'},{id:'d',nom:'ABSENT',prenom:'Test',type_apprenant:'ta'},{id:'e',nom:'VA',prenom:'Test',type_apprenant:'va'}],examens,notes:{a:{1:{etat:'definitif',note:0},2:{etat:'definitif',note:18}},b:{1:{etat:'attente',note:null},2:{etat:'non_passe',note:null}},c:{1:{etat:'definitif',note:20}},d:{1:{etat:'non_passe',note:null}},e:{1:{etat:'indisponible',note:null}}},matieres:{a:{EB1:{a:{etat:'definitif',note:0},b:{etat:'attente',note:null}}},b:{EB1:{a:{etat:'definitif',note:14},b:{etat:'definitif',note:10}}}},erreur:null};
if(new URLSearchParams(location.search).has('extremes')){
  for(const [id,nom,note] of [['f','ZÉRO EX ÆQUO',0],['g','INTERMÉDIAIRE',10],['h','MEILLEURE',18],['i','MEILLEURE EX ÆQUO',18]] as const){
    releve.inscrits.push({id,nom,prenom:'Test',type_apprenant:'vtc'});
    releve.notes[id]={1:{etat:'definitif',note,verdict:'echoue'},2:{etat:'definitif',note:18}};
  }
}
const sessions:GroupeSessionCrm[]=['fictive','vide'].map(id=>({cle:`crm:${id}`,type:'crm',typeSession:'theorique',libelle:id==='vide'?'Session vide':'Session fictive',periode:null,debut:'2026-01-01',fin:'2027-12-31',tri:'2026-01-01',nbCandidats:0,examens:[]}));
const charger=async(id:string)=>id==='vide'?{inscrits:[],notes:{},examens,matieres:{},erreur:null}:structuredClone(releve);
const actualisation=new URLSearchParams(location.search).has('actualisation');
if(new URLSearchParams(location.search).has('liens'))releve.notes.c[1]={etat:'attente',note:null};
if(new URLSearchParams(location.search).has('provenance')){
 releve.notes.c[1]={etat:'attente',note:null};
 const d={sessionCle:'crm:ancienne',jour:'2026-10-30',attemptId:'passage-vtc',libelle:'Session ancienne · 30/10/2026',qrcRestantes:4,vue:'corriger' as const};
 releve.sourcesAttente={a:{EB1:{b:{destinations:[d]}}},b:{EB1:{a:{destinations:[d]}}},c:{'EB1-TAXI':{a:{destinations:[{...d,attemptId:'passage-taxi'},{...d,sessionCle:'crm:autre',jour:'2026-11-11',attemptId:'passage-taxi-2',libelle:'Autre session · 11/11/2026',qrcRestantes:2}]}}}};
}
const souscrireFictif=(_ids:string[],signal:()=>void)=>{
  const valider=()=>{releve.notes.b[1]={etat:'definitif',note:0};signal();};
  window.addEventListener('fixture-validation',valider);
  return()=>window.removeEventListener('fixture-validation',valider);
};
const chargerAbsences=async()=>{
  const cas=new URLSearchParams(location.search).get('absence');
  const row=(id:string)=>({apprenant_id:id,apprenants:{type_apprenant:'vtc'},sessions:{type_session:'theorique',nom:'VTC',date_debut:'2026-11-02',date_fin:'2026-11-13'}});
  const sig=(id:string,slot:string)=>({apprenant_id:id,demi_journee:slot,signed_at:'2026-11-11T08:00:00Z',signature_data_url:'data:image/png;base64,YWJj'});
  return absentsSessionJour({jour:'2026-11-11',minuteParis:cas==='partiel'?14*60:18*60,inscriptions:[row('b'),row('a')],signatures:cas==='sans-cours'?[]:[sig('a','matin'),sig('a','apres_midi'),...(cas==='signe'?[sig('b','matin')]:[])],papier:cas==='papier'?[{apprenant_id:'b',heures:3,documents_inscription:{url:'preuve.pdf',statut:'valide'}}]:[],heures:[],erreur:cas==='erreur'||!cas});
};
const root=document.getElementById('root');if(root)createRoot(root).render(<NotesParSession sessions={sessions} charger={charger} souscrire={actualisation?souscrireFictif:()=>()=>{}} chargerAbsences={chargerAbsences}/>);