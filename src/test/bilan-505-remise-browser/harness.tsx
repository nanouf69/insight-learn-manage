import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import ModuleDetailView from '@/components/cours-en-ligne/ModuleDetailView';
import { supabase } from '@/integrations/supabase/client';
import { setAnswerSaveAuthToken,setAnswerSaveOwnership } from '@/lib/answerPersistence';
import { Toaster } from 'sonner';
import '@/index.css';
const A='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222';
const scenario=new URLSearchParams(location.search).get('case')??'concordant';
const answers=Object.fromEntries(Array.from({length:49},(_,i)=>[`505-${i+1}`,['A','B']]));
let row={id:'33333333-3333-4333-8333-333333333333',apprenant_id:A,exercice_id:'module_5_exo_505',tentative:1,write_seq:100,status:'in_progress',reponses:answers,stored_reponses:answers,grading_status:'verifiable',score:100,bonnes_reponses:49,total_questions:49};
const calls:string[]=[];Object.assign(window,{fixtureCalls:calls});
const questions=Array.from({length:49},(_,i)=>({id:i+1,type:'QCM',enonce:`Question fictive ${i+1}`,choix:[{lettre:'A',texte:'Choix A',correct:true},{lettre:'B',texte:'Choix B',correct:true},{lettre:'C',texte:'Choix C'}]}));
const moduleData={id:5,nom:'Bilan examen VTC',description:'',cours:[],exercices:[{id:505,titre:'Développement commercial',actif:true,questions}]};
(supabase.auth as any).getSession=async()=>({data:{session:{user:{id:U},access_token:'synthetic-only',refresh_token:'synthetic-only',expires_at:4102444800}},error:null});
(supabase.auth as any).getUser=async()=>({data:{user:{id:U}},error:null});
(supabase as any).rpc=async(name:string,args:any)=>{
 calls.push(name);
 if(name==='bilan_future_route')return {data:'legacy',error:null};
 if(name==='bilan_ouvrir_passage_eleve')return {data:{statut:'ancien'},error:null};
 if(name==='bilan_505_remise_prepare')return {data:{id:row.id,tentative:1,write_seq:100,status:row.status,grading_status:scenario==='missing'?'corrige_snapshot_incomplet':'verifiable',reponses:scenario==='journal'?{...answers,'505-1':['B']}:answers,stored_reponses:answers},error:null};
 if(name==='bilan_505_remise_commit'){
   if(scenario==='late')await new Promise(r=>setTimeout(r,21000));
   row={...row,status:'submitted',reponses:args.p_reponses};return {data:row,error:null};
 }
 return {data:[],error:null};
};
(supabase as any).from=(table:string)=>{
 const filters:Record<string,unknown>={};
 const rows=()=>table==='module_editor_state'?[{module_id:5,module_data:moduleData,deleted_cours:[],deleted_exercices:[]}]:table==='reponses_apprenants'?(filters.exercice_id&&filters.exercice_id!==row.exercice_id?[]:[row]):[];
 const q:any=new Proxy({}, {get:(_,k)=> k==='then'?(resolve:any)=>resolve({data:rows(),error:null}):k==='maybeSingle'||k==='single'?async()=>({data:rows()[0]??null,error:null}):(...args:any[])=>{if(k==='eq')filters[args[0]]=args[1];return q;}});return q;
};
// Old blocked batch: preserved during successful submission, not falsely ACKed.
localStorage.clear();sessionStorage.clear();
localStorage.setItem('answer_save_queue_v1',JSON.stringify(scenario==='journal'?[]:[{id:'old-blocked',owner_user_id:U,blocked:true,attempts:1,queued_at:'2026-11-13',payload:{apprenant_id:A,user_id:U,exercice_id:row.exercice_id,exercice_type:'quiz',reponses:scenario==='queue'?{...answers,'505-1':['C']}:answers,events:[],base_seq:1}}]));
setAnswerSaveAuthToken('synthetic-only',U);setAnswerSaveOwnership({apprenantId:A,previewReadOnly:false});
const root=document.getElementById('root');
if(root)createRoot(root).render(<QueryClientProvider client={new QueryClient()}><ModuleDetailView module={moduleData as any} studentOnly apprenantId={A} onBack={()=>{}}/><Toaster/></QueryClientProvider>);