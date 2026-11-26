// Isolated test entry, not referenced from app routes. All non-loopback requests are blocked by the test driver.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {EcranResultats} from '@/components/cours-en-ligne/ExamenBlancsResultats';
import {EXAMENS_BLANCS_VTC} from '@/components/cours-en-ligne/examens-blancs-data';
import {EvaluationCompetencesI21} from '@/components/formateurs/EvaluationCompetencesI21';
import {CRITERES_I21} from '@/lib/evaluationCompetencesI21';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import '@/index.css';
const params=new URLSearchParams(location.search);
const exam=EXAMENS_BLANCS_VTC.find(e=>e.id===(params.get('exam')??'EB1'));
const mode=params.get('mode')??'resultats';
const review={id:'fictif-review',signed_at:'2026-01-01T12:00:00Z',reponses:{evaluation_i21_version:1,criteres:Object.fromEntries(CRITERES_I21.map(c=>[c.id,'acquis'])),commentaire:''},preuve:{pdf_empreinte:'fictif-sha',signed_at:'2026-01-01T12:00:00Z',signe_le_paris:'DATE FICTIVE DE TEST'}};
const root=document.getElementById('root');
if(root)createRoot(root).render(<QueryClientProvider client={new QueryClient()}><main className="p-4">
  {mode.startsWith('i21')?<EvaluationCompetencesI21 documentId="fictif-document" doc={{statut:'signe',destinataire_nom:'INTERVENANT FICTIF TEST',reponses:{}}} fichiers={[]} reviews={mode==='i21-signe'?[review]:[]} onSaved={async()=>({data:{reviews:[review]}})}/>:exam?<EcranResultats examen={exam} resultats={exam.matieres.map((m,i)=>i===0||params.get('state')==='non-passe'?null:{matiereId:m.id,nomMatiere:m.nom,quizId:exam.id,noteSur:m.noteSur,noteObtenue:12,maxPoints:20,noteEliminatoire:m.noteEliminatoire,coefficient:m.coefficient,admis:true,reponses:{},resultId:`fictif-${i}`,details:{qrc_pending_correction:params.get('state')==='qrc'}}) as any} onRecommencer={()=>{}} onRetour={()=>{}} onRefaireFausses={()=>{}} isViewingSaved/>:null}
</main></QueryClientProvider>);