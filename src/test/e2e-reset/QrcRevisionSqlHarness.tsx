import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { EcranResultats, RevisionFausses } from '@/components/cours-en-ligne/ExamenBlancsResultats';
import NotesView from '@/components/cours-en-ligne/NotesView';
import { setAnswerSaveAuthToken,setAnswerSaveOwnership } from '@/lib/answerPersistence';
import '@/index.css';
const app='11111111-1111-4111-8111-000000000001',user='22222222-2222-4222-8222-000000000002';
setAnswerSaveOwnership({apprenantId:app,previewReadOnly:false});setAnswerSaveAuthToken('fixture-only',user);
const questions:any[]=[{id:1,type:'QCM',enonce:'Question multiple fictive',choix:[{lettre:'A',texte:'Choix A',correct:false},{lettre:'B',texte:'Choix B',correct:true},{lettre:'C',texte:'Choix C',correct:true}]},{id:2,type:'QRC',enonce:'Question ouverte fictive',reponseQRC:'texte',reponses_possibles:['texte']}];
const matiere:any={id:'t3p',nom:'T3P',questions,coefficient:1,noteEliminatoire:6,noteSur:20,duree:30};
const examen:any={id:'EB2-TAXI',titre:'Examen fictif isolé',matieres:[matiere]};
const result:any={matiereId:'t3p',nomMatiere:'T3P',quizId:'EB2-TAXI',completedAt:'2026-11-08T20:00:00Z',resultId:'r-qrc',details:{questions,reponses:{1:['B','C'],2:'texte'}},reponses:{1:['B','C'],2:'texte'},noteObtenue:2,maxPoints:6,coefficient:1,admis:false,qrcPendingCorrection:true};
function Harness(){const[finished,setFinished]=useState(false);const[owner,setOwner]=useState(app);
 const mode=new URLSearchParams(location.search).get('mode');
 return <main className="p-5"><h1>Preuve SQL fictive</h1>{mode==='revision'?<><p role="status">{finished?'TERMINE':'EN COURS'}</p><RevisionFausses wrongQuestions={questions.map(question=>({question,matiere,matiereNom:'T3P'}))} apprenantId={app} userId={user} examenId={examen.id} onTerminer={()=>setFinished(true)}/></>:<><button onClick={()=>setOwner(owner===app?'33333333-3333-4333-8333-000000000003':app)}>Changer fixture</button><NotesView apprenantId={owner} studentName="Fictif"/><EcranResultats examen={examen} resultats={[result]} apprenantId={owner} userId={user} onRetour={()=>{}} onRecommencer={()=>{}} onRefaireFausses={()=>{}} isViewingSaved isPresentiel canRetry={false}/></>}</main>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<Harness/>);