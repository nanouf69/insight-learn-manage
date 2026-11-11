// Isolated UI fixture. The browser must block every request outside localhost.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BilanFutureExam} from '@/components/cours-en-ligne/BilanFutureExam';
import {supabase} from '@/integrations/supabase/client';
import '@/index.css';
const questions=Array.from({length:255},(_,n)=>({id:n+1,enonce:`Question fictive ${n+1}`,image:n===0?'/cours/exercices/securite/image1.png':undefined,imageSize:'sm',choix:[{lettre:'A',texte:'Réponse fictive A'},{lettre:'B',texte:'Réponse fictive B'}]}));
const owner='fictif-sr';
const receipt={id:'fictif-receipt',version_id:'fictif-version',module_id:11,exercise_id:602};
const saved:Record<string,{answer:string[];revision:number}>={};
const key='fictif-sr-test-only';
const previous=sessionStorage.getItem(key);
if(previous)Object.assign(saved,JSON.parse(previous));
(supabase as any).rpc=async(name:string,args:any)=>{
 if(name==='bilan_future_open')return {data:receipt,error:null};
 if(name==='bilan_future_questions')return {data:{version_id:receipt.version_id,questions},error:null};
 if(name==='bilan_future_resume')return {data:{version_id:receipt.version_id,submitted:false,answers:saved},error:null};
 if(name==='bilan_future_save_draft'){saved[String(args.p_question)]={answer:args.p_answer,revision:args.p_revision};sessionStorage.setItem(key,JSON.stringify(saved));return {data:null,error:null};}
 return {data:null,error:{code:'fictif-refus'}};
};
(supabase as any).from=()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null,error:null}),then:(resolve:any)=>resolve({data:[{id:'fictif-receipt',exercise_id:500,bilan_future_submissions:{correct_count:1,question_count:1}},{id:'fictif-receipt',exercise_id:600,bilan_future_submissions:{correct_count:1,question_count:1}},{id:'fictif-receipt',exercise_id:601,bilan_future_submissions:{correct_count:1,question_count:1}}],error:null})};return q;};
const root=document.getElementById('root');
if(root)createRoot(root).render(<BilanFutureExam moduleId={11} ownerId={owner}/>);
