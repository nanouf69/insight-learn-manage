import { createRoot } from 'react-dom/client';
import { NotesParSession } from '@/features/correction-qrc-v2/NotesParSession';
import type { ReleveSession, ExamenNotesSession } from '@/features/correction-qrc-v2/notesSession';
import type { GroupeSessionCrm } from '@/features/correction-qrc-v2/noyauReel';
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
const charger=async(id:string)=>id==='vide'?{inscrits:[],notes:{},examens,matieres:{},erreur:null}:releve;
const root=document.getElementById('root');if(root)createRoot(root).render(<NotesParSession sessions={sessions} charger={charger}/>);