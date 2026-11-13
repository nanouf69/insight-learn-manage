// Test-only: real CRM panel with an in-memory query fixture. All external
// network requests must be blocked by the browser contract. No real session.
import React, {useState} from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExamensBlancsResetTab from '@/components/crm/apprenant-sections/ExamensBlancsResetTab';
import {supabase} from '@/integrations/supabase/client';
import {RefaireMatiereButton} from '@/components/cours-en-ligne/RefaireMatiereButton';
import {validateSubjectRetakeReceipt,type SubjectRetakeReceipt} from '@/lib/examSubjectRetake';
import {EXAMENS_BLANCS_VTC,EXAMENS_BLANCS_TAXI} from '@/components/cours-en-ligne/examens-blancs-data';
import {Button} from '@/components/ui/button';
import '@/index.css';
const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
const track = new URLSearchParams(location.search).get('track') === 'taxi' ? 'taxi' : 'vtc';
const quizId = track === 'taxi' ? 'EB3-TAXI' : 'EB3';
client.setQueryData(['examens-blancs-live'],track==='taxi'?EXAMENS_BLANCS_TAXI:EXAMENS_BLANCS_VTC);
client.setQueryData(['examen-blanc-results-admin', 'fictif-only', 0], [{
  examenNum: 3, examenLabel: `Examen Blanc 3 — ${track.toUpperCase()}`, type: track, quizId,
  totalScore: 27, totalMax: 40, lastDate: '2026-11-01T12:00:00Z',
  results: [
    ...(track==='taxi' ? [
      {result_id:'fictif-f',quiz_id:quizId,matiere_id:'reglementation_taxi',matiere_nom:'F(T) - Réglementation nationale TAXI',score_obtenu:15,score_max:20,completed_at:'2026-11-01T12:00:00Z'},
      {result_id:'fictif-g',quiz_id:quizId,matiere_id:'reglementation_taxi2',matiere_nom:'G(T) - Connaissance du territoire et réglementation locale TAXI',score_obtenu:8,score_max:20,completed_at:'2026-11-01T12:00:00Z'},
    ] : []),
    { result_id: 'fictif-gestion', quiz_id: quizId, matiere_id: 'gestion', matiere_nom: 'B Gestion', score_obtenu: 15, score_max: 20, completed_at: '2026-11-01T12:00:00Z' },
    { result_id: 'fictif-anglais', quiz_id: quizId, matiere_id: 'anglais', matiere_nom: 'E Anglais', score_obtenu: 12, score_max: 20, completed_at: '2026-11-01T12:00:00Z' },
  ],
}]);
function Harness(){
 const [mode,setMode]=useState('admin');
 const [receipt,setReceipt]=useState<SubjectRetakeReceipt|null>(null);
 return <div className="p-4 space-y-4"><Button onClick={()=>setMode(mode==='admin'?'learner':'admin')}>{mode==='admin'?'Espace élève':'Espace admin'}</Button>
 {mode==='admin'?<ExamensBlancsResetTab apprenant={{id:'fictif-only',prenom:'Élève',nom:'FICTIF'}}/>:
 <div><RefaireMatiereButton owner="fictif-owner" account="fictif-only" exam={quizId} subject="t3p" sourceExercise={`${quizId}__t3p`} onStarted={setReceipt}/>
 <Button onClick={async()=>{const {data,error}=await supabase.from('exam_subject_retakes' as never).select('*').eq('apprenant_id','fictif-only').eq('exam_id',quizId).eq('matiere_id','t3p').maybeSingle();if(!error&&data)setReceipt(validateSubjectRetakeReceipt(data,'fictif-only',quizId,'t3p'));}}>Relire ma copie</Button>
 {receipt&&<section aria-label="Copie ouverte"><h2>{receipt.matiere.nom}</h2><p>Nouvelle tentative {receipt.tentative} — non notée</p>{receipt.matiere.questions.map(q=><p key={q.id}>{q.enonce}</p>)}</section>}</div>}
 </div>;
}
const root=document.getElementById('root');
if(root)createRoot(root).render(<QueryClientProvider client={client}><Harness/></QueryClientProvider>);
