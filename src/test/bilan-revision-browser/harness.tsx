// Test-only isolated adapter: no hosted request or real account.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/integrations/supabase/client';
import { setAnswerSaveAuthToken,setAnswerSaveOwnership } from '@/lib/answerPersistence';
import { BilanFutureExam } from '@/components/cours-en-ligne/BilanFutureExam';
import '@/index.css';
const owner='11111111-1111-4111-8111-111111111111';
const questions=[{id:71,enonce:'Question fictive sécurité',choix:[{lettre:'A',texte:'Oui'},{lettre:'B',texte:'Non'}]},{id:226,enonce:'Question fictive multiple',choix:[{lettre:'A',texte:'Choix A'},{lettre:'C',texte:'Choix C'}]}];
const read=()=>JSON.parse(sessionStorage.getItem('fixture-server')??'[]');
(supabase.auth as any).getSession=async()=>({data:{session:{user:{id:'fixture'},access_token:'fixture'}}});
(supabase as any).rpc=async(name:string)=>{
 if(name==='bilan_future_open')return {data:{id:'fixture-receipt',version_id:'fixture-version'}};
 if(name==='bilan_future_questions')return {data:{version_id:'fixture-version',questions}};
 if(name==='bilan_future_resume')return {data:{version_id:'fixture-version',answers:{},submitted:true}};
 if(name==='bilan_future_correction')return {data:{receipt_id:'fixture-receipt',version_id:'fixture-version',correct_count:0,question_count:2,questions:questions.map(q=>({id:q.id,answer:['B'],correct:q.id===71?['A']:['A','C']}))}};
 return {data:[],error:null};
};
(supabase as any).from=(table:string)=>{
 let id=''; const q:any={select:()=>q,eq:(k:string,v:string)=>{if(k==='exercice_id')id=v;return q;},like:()=>q,order:()=>q,range:async()=>({data:read()}),maybeSingle:async()=>({data:table==='bilan_future_submissions'?{correct_count:0,question_count:2}:read().find((r:any)=>r.exercice_id===id)??null}),then:(f:any)=>f({data:[]})};return q;
};
const originalFetch=window.fetch.bind(window);
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 if(String(input).includes('/functions/v1/upsert-reponse-apprenant')){
  if((window as any).fixtureOffline)return new Response('network',{status:503});
  await new Promise(r=>setTimeout(r,250));const b=JSON.parse(String(init?.body));const rows=read();let row=rows.find((r:any)=>r.exercice_id===b.exercice_id);
  if(!row){row={id:'row',exercice_id:b.exercice_id,reponses:{},write_seq:0,status:'in_progress'};rows.push(row);}
  row.reponses=b.reponses;row.write_seq++;sessionStorage.setItem('fixture-server',JSON.stringify(rows));
  return new Response(JSON.stringify({success:true,confirmed:true,write_seq:row.write_seq,accepted_event_ids:b.events.map((e:any)=>e.event_id)}),{status:200,headers:{'Content-Type':'application/json'}});
 }
 if(String(input).startsWith('https:'))return new Response('{}',{status:503});return originalFetch(input,init);
};
setAnswerSaveAuthToken('fixture','fixture');setAnswerSaveOwnership({apprenantId:owner});
const root=document.getElementById('root');if(root)createRoot(root).render(<BilanFutureExam moduleId={5} ownerId="fixture" apprenantId={owner}/>);