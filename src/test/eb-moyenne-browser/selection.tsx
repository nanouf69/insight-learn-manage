import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import SelectionCopieMoyennePreview from '@/components/crm/apprenant-sections/SelectionCopieMoyennePreview';
import {supabase} from '@/integrations/supabase/client';
import {previousAttempt} from '@/lib/ebPreviousAttempt';
import {EXAMENS_BLANCS_TAXI} from '@/components/cours-en-ligne/examens-blancs-data';
import type {CoreMatiereState} from '@/lib/coreExamPublication';
import '@/index.css';
const exam=EXAMENS_BLANCS_TAXI.find(e=>e.id==='EB3-TAXI');
const notes=[['t3p',2],['gestion',13],['securite',14],['francais',9.5],['anglais',9],['reglementation_taxi',14],['reglementation_taxi2',18]] as const;
const rows=[{id:'t3p-1',matiere_id:'t3p',tentative:1,completed_at:'2026-11-01T17:15:42Z',score_obtenu:8.5},...notes.map(([id,note])=>({id:`${id}-2`,matiere_id:id,tentative:2,completed_at:'2026-11-09T20:21:19Z',score_obtenu:note}))].map(r=>({...r,apprenant_id:'fiction',quiz_id:'EB3-TAXI',quiz_type:'examen_blanc',score_max:20,matiere_nom:r.matiere_id,details:{questions:[{id:1,type:'QRC'}],reponses:{1:'réponse fictive'},qrc_pending_correction:true}}));
const core:CoreMatiereState[]=rows.map(r=>({attemptId:`copy-${r.id}`,resultId:r.id,apprenantId:'fiction',examId:'EB3-TAXI',matiereId:r.matiere_id,tentative:r.tentative,finishedAt:r.completed_at,historicalDetails:r.details,note20:r.id==='t3p-1'?13:r.score_obtenu,status:'definitif',pending:false,qrcTotal:1,qrcRestantes:0,qrcProofs:[{questionId:`${r.matiere_id}:1`,reponse:'réponse fictive',etat:'corrigee',note:1}]}));
const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
client.setQueryData(['copy-selection-admin'],true);
client.setQueryData(['copy-selection-preview','fiction','EB3-TAXI'],{rows,core,nonFiables:new Set(),resets:[]});
// Read-only harness: fresh query remains the same immutable fixture, never reaches Cloud.
client.setQueryDefaults(['copy-selection-preview','fiction','EB3-TAXI'],{queryFn:async()=>({rows,core,nonFiables:new Set(),resets:[]})});
supabase.auth.getUser=async()=>({data:{user:null},error:null});
const root=document.getElementById('root');
if(root&&exam){const previous=previousAttempt(exam,rows,core,new Set());createRoot(root).render(<QueryClientProvider client={client}><main className="p-4 space-y-4"><p>{previous?.label} : {previous?.note} / 20</p><SelectionCopieMoyennePreview account="fiction" nom="Test FICTIF" exam={exam}/></main></QueryClientProvider>);}